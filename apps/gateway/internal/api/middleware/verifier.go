package middleware

import (
	"context"
	"fmt"
	"roost/internal/core/domain"

	"github.com/coreos/go-oidc/v3/oidc"
)

type TokenVerifier interface {
	Verify(ctx context.Context, rawToken string) (domain.JwtClaims, error)
}

type tokenVerifier struct {
	verifier *oidc.IDTokenVerifier
}

func NewTokenVerifier(ctx context.Context, issuerURL string, clientID string) (TokenVerifier, error) {
	provider, err := oidc.NewProvider(ctx, issuerURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create OIDC provider: %w", err)
	}
	// Configure the verifier with your client ID
	// This will validate the 'aud' claim matches your client
	verifier := provider.Verifier(&oidc.Config{
		ClientID:        clientID,
		SkipIssuerCheck: true,
	})
	return &tokenVerifier{
		verifier: verifier,
	}, nil
}

func (v *tokenVerifier) Verify(ctx context.Context, rawToken string) (domain.JwtClaims, error) {
	i, err := v.verifier.Verify(ctx, rawToken)
	if err != nil {
		return domain.JwtClaims{}, err
	}
	var claims map[string]any
	if err := i.Claims(&claims); err != nil {
		return domain.JwtClaims{}, err
	}
	return domain.JwtClaims{
		Email:   claims["email"].(string),
		Subject: claims["sub"].(string),
		Name:    claims["name"].(string),
		IsDemo:  false,
	}, nil
}
