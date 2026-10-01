package core

import (
	"context"
	"roost/internal/core/domain"

	"github.com/google/uuid"
)

type CameraRepo interface {
	List(ctx context.Context) ([]domain.Camera, error)
	Get(ctx context.Context, id uuid.UUID) (*domain.Camera, error)
	Create(ctx context.Context, cameraType domain.CameraType, name string) (*domain.Camera, error)
	Update(ctx context.Context, id uuid.UUID, name string) (*domain.Camera, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
