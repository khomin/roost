package handlers

import (
	"context"
	"roost/internal/api/middleware"
	"roost/internal/core"
	"roost/internal/core/domain"

	roostv1 "roost/gen/v1/roost"

	"github.com/google/uuid"
	"github.com/pion/webrtc/v4"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type RoostHandler struct {
	service *core.CameraService
	hub     *core.StreamHub
}

func NewRoostService(
	service *core.CameraService,
	hub *core.StreamHub,
) *RoostHandler {
	return &RoostHandler{
		service: service,
		hub:     hub,
	}
}

func (s *RoostHandler) ListCameras(ctx context.Context, req *roostv1.ListCamerasRequest) (*roostv1.ListCamerasResponse, error) {
	_, ok := middleware.GetUser(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, domain.ErrorUnauthorized.Error())
	}
	res, err := s.service.ListCameras(ctx)
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

func (s *RoostHandler) GetCamera(ctx context.Context, req *roostv1.GetCameraRequest) (*roostv1.GetCameraResponse, error) {
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
	return &roostv1.GetCameraResponse{
		Camera: res.ToGrpc(),
	}, nil
}

func (s *RoostHandler) CreateCamera(ctx context.Context, req *roostv1.CreateCameraRequest) (*roostv1.CreateCameraResponse, error) {
	_, ok := middleware.GetUser(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, domain.ErrorUnauthorized.Error())
	}
	res, err := s.service.CreateCamera(ctx, core.CreateCameraRequest{
		Name:       req.Name,
		Source:     req.Source,
		CameraType: domain.FromGrpc(req.Type),
	})
	if err != nil {
		return nil, domain.ToGRPCError(err)
	}
	return &roostv1.CreateCameraResponse{
		Camera: res.ToGrpc(),
	}, nil
}

func (s *RoostHandler) UpdateCamera(ctx context.Context, req *roostv1.UpdateCameraRequest) (*roostv1.UpdateCameraResponse, error) {
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
	return &roostv1.UpdateCameraResponse{
		Camera: res.ToGrpc(),
	}, nil
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

func (s *RoostHandler) SignalWebRTC(ctx context.Context, req *roostv1.SignalWebRTCRequest) (*roostv1.SignalWebRTCResponse, error) {
	offer := webrtc.SessionDescription{
		Type: webrtc.SDPTypeOffer,
		SDP:  req.GetSdpOffer(),
	}
	m := &webrtc.MediaEngine{}
	if err := m.RegisterDefaultCodecs(); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to register codecs: %v", err)
	}
	api := webrtc.NewAPI(webrtc.WithMediaEngine(m))
	pc, err := api.NewPeerConnection(webrtc.Configuration{})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create peer connection: %v", err)
	}
	track, err := webrtc.NewTrackLocalStaticSample(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeH264},
		"video",
		"roost-live-stream",
	)
	if err != nil {
		return nil, status.Error(codes.Internal, domain.ErrorInternalError.Error())
	}
	if _, err := pc.AddTrack(track); err != nil {
		pc.Close()
		return nil, status.Errorf(codes.Internal, "failed to add track: %v", err)
	}
	if err := pc.SetRemoteDescription(offer); err != nil {
		pc.Close()
		return nil, status.Errorf(codes.InvalidArgument, "invalid sdp offer: %v", err)
	}
	answer, err := pc.CreateAnswer(nil)
	if err != nil {
		pc.Close()
		return nil, status.Errorf(codes.Internal, "failed to create answer: %v", err)
	}
	gatherComplete := webrtc.GatheringCompletePromise(pc)
	if err := pc.SetLocalDescription(answer); err != nil {
		pc.Close()
		return nil, status.Errorf(codes.Internal, "failed to set local description: %v", err)
	}
	<-gatherComplete

	s.hub.AddViewer(req.CameraId, track)

	return &roostv1.SignalWebRTCResponse{
		SdpType:   "answer",
		SdpAnswer: pc.LocalDescription().SDP,
	}, nil
}

func (s *RoostHandler) SubscribeLiveEvents(ctx *roostv1.SubscribeLiveEventsRequest, req grpc.ServerStreamingServer[roostv1.LiveEvent]) error {
	panic("unimplemented")
}
