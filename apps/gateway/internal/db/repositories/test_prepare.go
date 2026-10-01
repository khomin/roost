package repositories

import (
	"context"
	"roost/bootstrap"
	"roost/internal/core/domain"
	"roost/internal/db"
)

func Prepare() (context.Context, *db.DataBase, error) {
	ctx := context.Background()
	cfg := bootstrap.Config{
		Database: bootstrap.DatabaseConfig{
			Host:     "localhost",
			Port:     5432,
			User:     "tracker_admin",
			Password: "super_secure_password",
			Name:     "whale_tracker",
		},
	}
	db, err := db.NewDatabase(cfg.DSN())
	return ctx, db, err
}

func DemoUser() domain.User {
	return domain.User{
		ID:    "auth|demo",
		Name:  "Demo",
		Email: "test@test.com",
	}
}
