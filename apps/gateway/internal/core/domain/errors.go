package domain

import (
	"errors"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var (
	ErrorUnauthorized         = errors.New("unauthorized")
	ErrorNotFound             = errors.New("Not found")
	ErrorAlreadyExists        = errors.New("Already exists")
	ErrorInternalError        = errors.New("Internal error")
	ErrorInvalidArgument      = errors.New("Invalid argument")
	ErrorNotAllowedInDemoMode = errors.New("Not allowed in demo mode")
)

func ToGRPCError(err error) error {
	switch {
	case errors.Is(err, ErrorUnauthorized):
		return status.Error(codes.Unauthenticated, err.Error())
	case errors.Is(err, ErrorInvalidArgument):
		return status.Error(codes.InvalidArgument, err.Error())
	case errors.Is(err, ErrorNotFound):
		return status.Error(codes.NotFound, err.Error())
	case errors.Is(err, ErrorAlreadyExists):
		return status.Error(codes.AlreadyExists, err.Error())
	default:
		return status.Error(codes.Internal, ErrorInternalError.Error())
	}
}
