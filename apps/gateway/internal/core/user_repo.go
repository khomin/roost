package core

import (
	"context"
	"roost/internal/core/domain"
)

type UserRepo interface {
	List(ctx context.Context) ([]domain.User, error)
	EnsureExists(ctx context.Context, user *domain.User) error
	GetByID(ctx context.Context, userID string) (*domain.User, error)
}
