package middleware

import (
	"context"
	"roost/internal/core/domain"
)

type demoTokenVerifier struct {
	next TokenVerifier
}

func NewDemoTokenVerifier(next TokenVerifier) TokenVerifier {
	return &demoTokenVerifier{next: next}
}

func (v *demoTokenVerifier) Verify(ctx context.Context, rawToken string) (domain.JwtClaims, error) {
	if rawToken == "demo_token" {
		return domain.JwtClaims{
			Subject: "demo",
			Email:   "demo@example.com",
			Name:    "Demo User",
			IsDemo:  true,
		}, nil
	}
	return v.next.Verify(ctx, rawToken)
}
