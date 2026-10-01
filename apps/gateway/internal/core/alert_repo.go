package core

import (
	"context"
	"roost/internal/core/domain"
)

type AlertRepository interface {
	Create(ctx context.Context, alert domain.Alert) (*domain.Alert, error)
	Update(ctx context.Context, userID, id string, alert domain.AlertUpdate) (*domain.Alert, error)

	Enable(ctx context.Context, userID, id string) (*domain.Alert, error)
	Pause(ctx context.Context, userID, id string) (*domain.Alert, error)
	DisableAsCompleted(ctx context.Context, userID, id string) (*domain.Alert, error)

	Delete(ctx context.Context, userID string, id string) error
	ListByUser(ctx context.Context, userID string) ([]domain.Alert, error)
	ListActive(ctx context.Context) ([]domain.Alert, error)
}
