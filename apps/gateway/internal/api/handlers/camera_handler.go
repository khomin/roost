package handlers

import (
	"context"
	"log/slog"
	"roost/internal/api/middleware"
	"roost/internal/core"
	"roost/internal/core/domain"
	"roost/internal/ipc"
	"time"

	roostv1 "roost/gen/v1/roost"

	"github.com/google/uuid"
	"github.com/pion/webrtc/v4"
	"github.com/pion/webrtc/v4/pkg/media"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type RoostHandler struct {
	service    *core.CameraService
	videoTrack *webrtc.TrackLocalStaticSample
}

func NewRoostHandler(service *core.CameraService) roostv1.RoostServiceServer {
	return &RoostHandler{
		service: service,
	}
}

func (s *RoostHandler) ListCameras(ctx context.Context, req *roostv1.ListCamerasRequest) (*roostv1.ListCamerasResponse, error) {
	user, ok := middleware.GetUser(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, domain.ErrorUnauthorized.Error())
	}
	res, err := s.service.ListCameras(ctx, user)
	if err != nil {
		return nil, domain.ToGRPCError(err)
	}
	out := make([]*roostv1.Camera, 0, len(res))
	for _, i := range res {
		out = append(out, i.ToGrpc())
	}
	return &roostv1.ListCamerasResponse{
		Cameras: out,
	}, nil
}

func (s *RoostHandler) GetCamera(ctx context.Context, req *roostv1.GetCameraRequest) (*roostv1.Camera, error) {
	_, ok := middleware.GetUser(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, domain.ErrorUnauthorized.Error())
	}
	id, err := uuid.Parse(req.Id)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "invalid ID")
	}
	res, err := s.service.GetCamera(ctx, id)
	if err != nil {
		return nil, domain.ToGRPCError(err)
	}
	return res.ToGrpc(), nil
}

func (s *RoostHandler) CreateCamera(ctx context.Context, req *roostv1.CreateCameraRequest) (*roostv1.Camera, error) {
	_, ok := middleware.GetUser(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, domain.ErrorUnauthorized.Error())
	}
	res, err := s.service.CreateCamera(ctx, req.Name, domain.CameraType(req.Type))
	if err != nil {
		return nil, domain.ToGRPCError(err)
	}
	return res.ToGrpc(), nil
}

func (s *RoostHandler) UpdateCamera(ctx context.Context, req *roostv1.UpdateCameraRequest) (*roostv1.Camera, error) {
	_, ok := middleware.GetUser(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, domain.ErrorUnauthorized.Error())
	}
	id, err := uuid.Parse(req.Id)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "invalid ID")
	}
	res, err := s.service.UpdateCamera(ctx, id, req.Name)
	if err != nil {
		return nil, domain.ToGRPCError(err)
	}
	return res.ToGrpc(), nil
}

func (s *RoostHandler) DeleteCamera(ctx context.Context, req *roostv1.DeleteCameraRequest) (*roostv1.DeleteCameraResponse, error) {
	_, ok := middleware.GetUser(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, domain.ErrorUnauthorized.Error())
	}
	id, err := uuid.Parse(req.Id)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "invalid ID")
	}
	err = s.service.DeleteCamera(ctx, id)
	if err != nil {
		return nil, domain.ToGRPCError(err)
	}
	return &roostv1.DeleteCameraResponse{}, nil
}

func (s *RoostHandler) GetRecordingDownloadUrl(ctx context.Context, req *roostv1.GetRecordingDownloadUrlRequest) (*roostv1.GetRecordingDownloadUrlResponse, error) {
	panic("unimplemented")
}

func (s *RoostHandler) GetSnapshot(ctc context.Context, req *roostv1.GetSnapshotRequest) (*roostv1.GetSnapshotResponse, error) {
	panic("unimplemented")
}

func (s *RoostHandler) ListRecordings(ctx context.Context, req *roostv1.ListRecordingsRequest) (*roostv1.ListRecordingsResponse, error) {
	panic("unimplemented")
}

func (s *RoostHandler) SignalWebRTC(ctx context.Context, req *roostv1.WebRTCSignalRequest) (*roostv1.WebRTCSignalResponse, error) {
	// 1. Parse the browser SDP offer
	offer := webrtc.SessionDescription{
		Type: webrtc.SDPTypeOffer,
		SDP:  req.GetSdpOffer(),
	}

	// 2. Create PeerConnection
	m := &webrtc.MediaEngine{}
	if err := m.RegisterDefaultCodecs(); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to register codecs: %v", err)
	}

	api := webrtc.NewAPI(webrtc.WithMediaEngine(m))
	pc, err := api.NewPeerConnection(webrtc.Configuration{})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create peer connection: %v", err)
	}

	videoTrack, err := webrtc.NewTrackLocalStaticSample(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeH264},
		"video",
		"roost-live-stream",
	)
	if err != nil {
		return nil, status.Error(codes.Internal, domain.ErrorInternalError.Error())
	}
	s.videoTrack = videoTrack

	// 3. Attach your H.264 video track from IPC
	if _, err := pc.AddTrack(s.videoTrack); err != nil {
		pc.Close()
		return nil, status.Errorf(codes.Internal, "failed to add track: %v", err)
	}

	// 4. Set Remote Description & Create Answer
	if err := pc.SetRemoteDescription(offer); err != nil {
		pc.Close()
		return nil, status.Errorf(codes.InvalidArgument, "invalid sdp offer: %v", err)
	}

	answer, err := pc.CreateAnswer(nil)
	if err != nil {
		pc.Close()
		return nil, status.Errorf(codes.Internal, "failed to create answer: %v", err)
	}

	// 5. Gather ICE candidates synchronously before returning response
	gatherComplete := webrtc.GatheringCompletePromise(pc)
	if err := pc.SetLocalDescription(answer); err != nil {
		pc.Close()
		return nil, status.Errorf(codes.Internal, "failed to set local description: %v", err)
	}

	<-gatherComplete

	testPipe := func() {
		c, err := ipc.NewConsumer("/roost_cam-1")
		if err != nil {
			slog.Error("err", "err", err)
		}
		defer c.Close()

		var prevPTS uint64
		var count int
		var duration time.Duration
		for {
			frame, hdr, err := c.ReadFrame()
			if err != nil {
				slog.Error("err", "err", err)
			}
			count++
			if duration.Milliseconds() == 0 {
				duration = 33 * time.Millisecond
			} else {
				duration = time.Duration(hdr.TimestampNs - prevPTS)
			}
			prevPTS = hdr.TimestampNs

			videoTrack.WriteSample(media.Sample{
				Data:     frame,
				Duration: duration,
			})
		}
	}
	go testPipe()

	// 6. Return the local SDP answer
	return &roostv1.WebRTCSignalResponse{
		SdpType:   "answer",
		SdpAnswer: pc.LocalDescription().SDP,
	}, nil
}

func (s *RoostHandler) SubscribeLiveEvents(ctx *roostv1.SubscribeEventsRequest, req grpc.ServerStreamingServer[roostv1.LiveEvent]) error {
	panic("unimplemented")
}
