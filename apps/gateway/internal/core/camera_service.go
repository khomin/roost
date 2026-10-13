package core

import (
	"context"
	"fmt"
	"log/slog"
	visionv1 "roost/gen/v1/vision"
	"roost/internal/core/domain"
	"roost/internal/ipc"
	"time"

	"github.com/google/uuid"
)

type CameraService struct {
	cameraRepo   CameraRepo
	userRepo     UserRepo
	tasks        *CameraTasks
	visionClient visionv1.VisionServiceClient
	hub          *StreamHub
	onDetections func(*visionv1.FrameDetections)
}

type CameraDeps struct {
	CameraRepo   CameraRepo
	UserRepo     UserRepo
	Tasks        *CameraTasks
	VisionClient visionv1.VisionServiceClient
	Hub          *StreamHub
	OnDetections func(*visionv1.FrameDetections)
}

func NewCameraService(deps CameraDeps) *CameraService {
	return &CameraService{
		cameraRepo:   deps.CameraRepo,
		userRepo:     deps.UserRepo,
		tasks:        deps.Tasks,
		visionClient: deps.VisionClient,
		onDetections: deps.OnDetections,
		hub:          deps.Hub,
	}
}

// How long an on-demand camera keeps running after its last viewer leaves,
// so a page reload doesn't restart the pipeline.
const onDemandGrace = 15 * time.Second

// wanted reports whether anything needs this camera's stream right now.
func (s *CameraService) wanted(camera domain.Camera) bool {
	if camera.Paused {
		return false
	}
	return camera.Mode != domain.CameraModeOnDemand || s.hub.ViewerCount(camera.ID) > 0
}

func (s *CameraService) Start(ctx context.Context) error {
	t := time.NewTicker(time.Second * 1)
	// both owned by this loop
	lastWanted := make(map[string]time.Time)
	stop := make(map[string]context.CancelFunc)
	for {
		select {
		case <-t.C:
			cameras, err := s.ListCamerasWithState(ctx)
			if err != nil {
				return err
			}
			seen := make(map[string]struct{}, len(cameras))
			for _, camera := range cameras {
				seen[camera.ID] = struct{}{}
				wanted := s.wanted(camera.Camera)
				if wanted {
					lastWanted[camera.ID] = time.Now()
				}
				if camera.State.IsActive() {
					if !wanted && (camera.Paused || time.Since(lastWanted[camera.ID]) > onDemandGrace) {
						if cancel, ok := stop[camera.ID]; ok {
							slog.Info("stopping idle camera", "camera", camera.ID)
							cancel()
							delete(stop, camera.ID)
						}
					}
					continue
				}
				if !wanted {
					continue
				}
				res, err := s.StartCamera(ctx, camera.Camera)
				if err != nil {
					continue
				}
				consumer, err := ipc.NewConsumer(res.ShmName)
				if err != nil {
					res.Cancel()
					continue
				}
				stop[camera.ID] = res.Cancel
				go func() {
					defer s.StopCamera(ctx, camera.UUID())
					defer res.Cancel()
					s.pumpFrames(res.Ctx, camera.ID, consumer)
				}()
			}
			// deleted cameras
			for id, cancel := range stop {
				if _, ok := seen[id]; !ok {
					cancel()
					delete(stop, id)
					delete(lastWanted, id)
				}
			}
		case <-ctx.Done():
			return nil
		}
	}
}

func (s *CameraService) ListCameras(ctx context.Context) ([]domain.CameraWithState, error) {
	cameras, err := s.cameraRepo.List(ctx)
	if err != nil {
		return nil, err
	}
	out := []domain.CameraWithState{}
	for _, camera := range cameras {
		state := domain.StateStopped
		cameraTask, ok := s.tasks.Get(camera.ID)
		if ok {
			state = cameraTask.State
		}
		out = append(out, domain.CameraWithState{
			Camera: camera,
			State:  state,
		})
	}
	return out, nil
}

func (s *CameraService) GetCamera(ctx context.Context, id uuid.UUID) (*domain.CameraWithState, error) {
	camera, err := s.cameraRepo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	state := domain.StateStopped
	cameraTask, ok := s.tasks.Get(camera.ID)
	if ok {
		state = cameraTask.State
	}
	return &domain.CameraWithState{
		Camera: *camera,
		State:  state,
	}, nil
}

func (s *CameraService) CreateCamera(ctx context.Context, req CreateCameraRequest) (*domain.Camera, error) {
	if req.CameraType == domain.CameraTypeUnspecified {
		return nil, domain.ErrorInvalidArgument
	}
	if req.Mode == domain.CameraModeUnspecified {
		req.Mode = domain.CameraModeAlwaysOn
	}
	camera, err := s.cameraRepo.Create(ctx, req)
	if err != nil {
		return nil, err
	}
	return camera, nil
}

func (s *CameraService) UpdateCamera(ctx context.Context, id uuid.UUID, req UpdateCameraRequest) (*domain.Camera, error) {
	v, err := s.cameraRepo.Update(ctx, id, req)
	if err != nil {
		return nil, err
	}
	return v, nil
}

func (s *CameraService) DeleteCamera(ctx context.Context, id uuid.UUID) error {
	return s.cameraRepo.Delete(ctx, id)
}

func (s *CameraService) StartCamera(ctx context.Context, camera domain.Camera) (*domain.CameraStartResult, error) {
	id, err := uuid.Parse(camera.ID)
	if err != nil {
		return nil, err
	}
	cam, err := s.cameraRepo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	s.tasks.Set(cam.ID, domain.StateStarting, nil)

	streamCtx, cancel := context.WithCancel(ctx)
	stream, err := s.visionClient.StartStream(streamCtx, &visionv1.StartStreamRequest{
		CameraId:   cam.ID,
		SourcePath: cam.SourcePath,
		Type:       cam.Type.ToGrpc(),
	})
	if err != nil {
		cancel()
		s.tasks.Set(cam.ID, domain.StateFailed, err)
		return nil, err
	}
	evt, err := stream.Recv()
	if err != nil {
		cancel()
		s.tasks.Set(cam.ID, domain.StateFailed, err)
		return nil, err
	}
	started := evt.GetStarted()
	if started == nil {
		cancel()
		s.tasks.Set(cam.ID, domain.StateFailed, fmt.Errorf("expected started event"))
		return nil, fmt.Errorf("vision: expected started event, got %T", evt.Event)
	}
	s.tasks.Set(cam.ID, domain.StateRunning, nil)
	go func() {
		// stops pumpFrames once vision reports the camera gone
		defer cancel()
		for {
			evt, err := stream.Recv()
			if err != nil {
				slog.Info("vision stream closed", "camera", cam.ID, "err", err)
				if streamCtx.Err() != nil {
					// we stopped it ourselves
					s.tasks.Set(cam.ID, domain.StateStopped, nil)
				} else {
					s.tasks.Set(cam.ID, domain.StateFailed, err)
				}
				return
			}
			switch e := evt.Event.(type) {
			case *visionv1.StartStreamEvent_Detections:
				s.onDetections(e.Detections)
			}
		}
	}()
	return &domain.CameraStartResult{
		ShmName:    started.ShmName,
		SlotCount:  started.SlotCount,
		SlotSize:   started.SlotSize,
		HeaderSize: started.HeaderSize,
		Ctx:        streamCtx,
		Cancel:     cancel,
	}, nil
}

func (s *CameraService) StopCamera(ctx context.Context, id uuid.UUID) error {
	v, err := s.cameraRepo.Get(ctx, id)
	if err != nil {
		return err
	}
	s.tasks.Set(v.ID, domain.StateStopped, nil)
	return nil
}

func (s *CameraService) ListCamerasWithState(ctx context.Context) ([]domain.CameraWithState, error) {
	cameras, err := s.cameraRepo.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]domain.CameraWithState, len(cameras))
	for i, cam := range cameras {
		state := domain.StateStopped
		var taskErr error
		if task, ok := s.tasks.Get(cam.ID); ok {
			state = task.State
			taskErr = task.Err
		}
		out[i] = domain.CameraWithState{
			Camera: cam,
			State:  state,
			Err:    taskErr,
		}
	}
	return out, nil
}

func (s *CameraService) pumpFrames(ctx context.Context, cameraID string, consumer *ipc.Consumer) {
	defer consumer.Close()
	var prevPTS uint64
	var duration time.Duration
	for {
		frame, hdr, err := consumer.ReadFrame(ctx)
		if err != nil {
			if ctx.Err() == nil {
				slog.Error("read frame", "camera", cameraID, "err", err)
			}
			return
		}
		if duration.Milliseconds() == 0 {
			duration = 33 * time.Millisecond
		} else {
			duration = time.Duration(hdr.TimestampNs - prevPTS)
		}
		prevPTS = hdr.TimestampNs
		s.hub.BroadcastFrame(cameraID, frame, duration)
	}
}
