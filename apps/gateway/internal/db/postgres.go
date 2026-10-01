package db

import (
	"context"
	"fmt"
	"time"

	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

type DataBase struct {
	Dsn    string
	Config *pgxpool.Config
	Pool   *pgxpool.Pool
}

func NewDatabase(dsn string) (*DataBase, error) {
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to parse DSN: %w", err)
	}
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("failed to create pool: %w", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}
	db := &DataBase{
		Dsn:    dsn,
		Config: config,
		Pool:   pool,
	}
	if err := db.runMigrations(); err != nil {
		slog.Error("failed to run migration", "err", err.Error())
	}
	return db, nil
}

func (d *DataBase) Close() {
	if d.Pool != nil {
		defer d.Pool.Close()
	}
}

func (d *DataBase) runMigrations() error {
	if d.Dsn == "" {
		return fmt.Errorf("dsn should not be empty")
	}
	m, err := migrate.New(
		"file://internal/db/migrations",
		fmt.Sprintf("%s?%s", d.Dsn, "sslmode=disable"),
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run up migrations: %w", err)
	}
	slog.Info("Database migrations applied successfully!")
	return nil
}
