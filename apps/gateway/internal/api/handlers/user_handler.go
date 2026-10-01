package handlers

import (
	"context"
	userv1 "roost/gen/v1/user"
	"roost/internal/api/middleware"
	"roost/internal/core"
	"roost/internal/core/domain"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type UserHandler struct {
	userRepo core.UserRepo
}

func NewUserHandler(repo core.UserRepo) userv1.UserServiceServer {
	return &UserHandler{
		userRepo: repo,
	}
}

func (p *UserHandler) GetUser(ctx context.Context, req *userv1.GetCurrentUserRequest) (*userv1.GetCurrentUserResponse, error) {
	user, ok := middleware.GetUser(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, domain.ErrorUnauthorized.Error())
	}
	return &userv1.GetCurrentUserResponse{
		Id:   user.ID,
		Name: user.Name,
	}, nil
}
