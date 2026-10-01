package core

import (
	"context"
	"roost/internal/core/domain"

	"github.com/google/uuid"
)

type CameraService struct {
	cameraRepo CameraRepo
	userRepo   UserRepo
}

type CameraDeps struct {
	CameraRepo CameraRepo
	UserRepo   UserRepo
}

func NewCameraService(deps CameraDeps) *CameraService {
	return &CameraService{
		cameraRepo: deps.CameraRepo,
		userRepo:   deps.UserRepo,
	}
}

func (s *CameraService) ListCameras(ctx context.Context, user *domain.User) ([]domain.Camera, error) {
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

func (s *CameraService) CreateCamera(ctx context.Context, name string, cameraType domain.CameraType) (*domain.Camera, error) {
	if cameraType == domain.CameraTypeUnspecified {
		return nil, domain.ErrorInvalidArgument
	}
	camera, err := s.cameraRepo.Create(ctx, cameraType, name)
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
