package handlers

import (
	"context"
	"roost/internal/api/middleware"
	"roost/internal/core"
	"roost/internal/core/domain"

	roostv1 "roost/gen/v1/roost"

	"github.com/google/uuid"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type CameraHandler struct {
	service *core.CameraService
}

func NewCameraHandler(service *core.CameraService) roostv1.RoostServiceServer {
	return &CameraHandler{
		service: service,
	}
}

func (s *CameraHandler) ListCameras(ctx context.Context, req *roostv1.ListCamerasRequest) (*roostv1.ListCamerasResponse, error) {
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

func (s *CameraHandler) GetCamera(ctx context.Context, req *roostv1.GetCameraRequest) (*roostv1.Camera, error) {
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

func (s *CameraHandler) CreateCamera(ctx context.Context, req *roostv1.CreateCameraRequest) (*roostv1.Camera, error) {
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

func (s *CameraHandler) UpdateCamera(ctx context.Context, req *roostv1.UpdateCameraRequest) (*roostv1.Camera, error) {
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

func (s *CameraHandler) DeleteCamera(ctx context.Context, req *roostv1.DeleteCameraRequest) (*roostv1.DeleteCameraResponse, error) {
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

func (s *CameraHandler) GetRecordingDownloadUrl(ctx context.Context, req *roostv1.GetRecordingDownloadUrlRequest) (*roostv1.GetRecordingDownloadUrlResponse, error) {
	panic("unimplemented")
}

func (s *CameraHandler) GetSnapshot(ctc context.Context, req *roostv1.GetSnapshotRequest) (*roostv1.GetSnapshotResponse, error) {
	panic("unimplemented")
}

func (s *CameraHandler) ListRecordings(ctx context.Context, req *roostv1.ListRecordingsRequest) (*roostv1.ListRecordingsResponse, error) {
	panic("unimplemented")
}

func (s *CameraHandler) SignalWebRTC(ctx context.Context, req *roostv1.WebRTCSignalRequest) (*roostv1.WebRTCSignalResponse, error) {
	panic("unimplemented")
}

func (s *CameraHandler) SubscribeLiveEvents(ctx *roostv1.SubscribeEventsRequest, req grpc.ServerStreamingServer[roostv1.LiveEvent]) error {
	panic("unimplemented")
}
