package middleware

import (
	"context"
	"roost/internal/core/domain"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

func UnaryAuthInterceptor(verifier TokenVerifier) grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		req any,
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (any, error) {
		if isPublicEndpoint(info.FullMethod) {
			return handler(ctx, req)
		}
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, status.Error(codes.Unauthenticated, "missing request metadata")
		}

		authHeader := md.Get("authorization")
		if len(authHeader) == 0 {
			return nil, status.Error(codes.Unauthenticated, "authorization header is required")
		}

		tokenStr := strings.TrimPrefix(authHeader[0], "Bearer ")

		claims, err := verifier.Verify(ctx, tokenStr)
		if err != nil {
			return nil, status.Errorf(codes.Unauthenticated, "invalid or expired token: %v", err)
		}

		newCtx := SetUser(ctx, domain.User{
			ID:     claims.Subject,
			Name:   claims.Name,
			Email:  claims.Email,
			IsDemo: claims.IsDemo,
		})

		return handler(newCtx, req)
	}
}

func isPublicEndpoint(method string) bool {
	publicMethods := map[string]bool{
		"/roost.v1.RoostService/SignalWebRTC": true,
	}
	return publicMethods[method]
}

const (
	OAUTH = "oauth_claims"
)

func SetUser(ctx context.Context, v domain.User) context.Context {
	return context.WithValue(ctx, OAUTH, v)
}

func GetUser(ctx context.Context) (*domain.User, bool) {
	v, ok := ctx.Value(OAUTH).(domain.User)
	return &v, ok
}
