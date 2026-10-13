package core

import (
	"context"
	"roost/internal/core/domain"

	"github.com/google/uuid"
)

type CreateCameraRequest struct {
	Name       string
	Source     string
	CameraType domain.CameraType
	Mode       domain.CameraMode
}

// UpdateCameraRequest: zero-value fields are left unchanged.
type UpdateCameraRequest struct {
	Name   string
	Mode   domain.CameraMode
	Paused *bool
}

type CameraRepo interface {
	List(ctx context.Context) ([]domain.Camera, error)
	Get(ctx context.Context, id uuid.UUID) (*domain.Camera, error)
	Create(ctx context.Context, req CreateCameraRequest) (*domain.Camera, error)
	Update(ctx context.Context, id uuid.UUID, req UpdateCameraRequest) (*domain.Camera, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
