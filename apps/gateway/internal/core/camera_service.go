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

// // test part
// cameras, _ := s.ListCameras(ctx)
// for _, camera := range cameras {
// 	id, _ := uuid.Parse(camera.ID)
// 	s.DeleteCamera(ctx, id)
// }
// s.CreateCamera(ctx, CreateCameraRequest{
// 	Name:       "roost-cam-1",
// 	Source:     "/dev/video0",
// 	CameraType: domain.CameraTypeUSB,
// })
//

func (s *CameraService) Start(ctx context.Context) error {
	t := time.NewTicker(time.Second * 1)
	for {
		select {
		case <-t.C:
			cameras, err := s.ListCamerasWithState(ctx)
			if err != nil {
				return err
			}
			for _, camera := range cameras {
				if camera.State.IsActive() {
					continue
				}
				res, err := s.StartCamera(ctx, camera.Camera)
				if err != nil {
					continue
				}
				consumer, err := ipc.NewConsumer(res.ShmName)
				if err != nil {
					continue
				}
				go func() {
					defer s.StopCamera(ctx, camera.UUID())
					s.pumpFrames(ctx, camera.ID, consumer)
				}()
			}
		case <-ctx.Done():
		}
	}
}

func (s *CameraService) ListCameras(ctx context.Context) ([]domain.Camera, error) {
	cameras, err := s.cameraRepo.List(ctx)
	if err != nil {
		return nil, err
	}
	return cameras, nil
}

func (s *CameraService) GetCamera(ctx context.Context, id uuid.UUID) (*domain.Camera, error) {
	camera, err := s.cameraRepo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	return camera, nil
}

func (s *CameraService) CreateCamera(ctx context.Context, req CreateCameraRequest) (*domain.Camera, error) {
	if req.CameraType == domain.CameraTypeUnspecified {
		return nil, domain.ErrorInvalidArgument
	}
	camera, err := s.cameraRepo.Create(ctx, req)
	if err != nil {
		return nil, err
	}
	return camera, nil
}

func (s *CameraService) UpdateCamera(ctx context.Context, id uuid.UUID, name string) (*domain.Camera, error) {
	v, err := s.cameraRepo.Update(ctx, id, name)
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

	stream, err := s.visionClient.StartStream(ctx, &visionv1.StartStreamRequest{
		CameraId:   cam.ID,
		SourcePath: cam.SourcePath,
		Type:       cam.Type.ToGrpc(),
	})
	if err != nil {
		s.tasks.Set(cam.ID, domain.StateFailed, err)
		return nil, err
	}
	evt, err := stream.Recv()
	if err != nil {
		s.tasks.Set(cam.ID, domain.StateFailed, err)
		return nil, err
	}
	started := evt.GetStarted()
	if started == nil {
		s.tasks.Set(cam.ID, domain.StateFailed, fmt.Errorf("expected started event"))
		return nil, fmt.Errorf("vision: expected started event, got %T", evt.Event)
	}
	s.tasks.Set(cam.ID, domain.StateRunning, nil)
	go func() {
		for {
			evt, err := stream.Recv()
			if err != nil {
				slog.Info("vision stream closed", "camera", cam.ID, "err", err)
				s.tasks.Set(cam.ID, domain.StateFailed, err)
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
		select {
		case <-ctx.Done():
			return
		default:
		}
		frame, hdr, err := consumer.ReadFrame()
		if err != nil {
			slog.Error("read frame", "camera", cameraID, "err", err)
			return
		}
		if duration.Milliseconds() == 0 {
			duration = 33 * time.Millisecond
		} else {
			duration = time.Duration(hdr.TimestampNs - prevPTS)
		}
		prevPTS = hdr.TimestampNs
		s.hub.BroadcastFrame(frame, duration)
	}
}
