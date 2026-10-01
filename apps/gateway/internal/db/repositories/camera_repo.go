package repositories

import (
	"context"
	"errors"
	"roost/internal/core"
	"roost/internal/core/domain"
	"roost/internal/db"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type rep struct {
	db *db.DataBase
}

func NewCameraRepository(db *db.DataBase) core.CameraRepo {
	return &rep{db: db}
}

func (r *rep) List(ctx context.Context) ([]domain.Camera, error) {
	query := `
		SELECT id, name, type, updated_at
		FROM cameras 
		ORDER BY updated_at ASC
	`
	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.Camera
	for rows.Next() {
		w, err := scanCamera(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *w)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *rep) Get(ctx context.Context, id uuid.UUID) (*domain.Camera, error) {
	query := `
		SELECT id, name, type, updated_at
		FROM cameras
		WHERE id = $1
	`
	row := r.db.Pool.QueryRow(ctx, query, id)
	v, err := scanCamera2(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrorNotFound
		}
		return nil, err
	}
	return v, nil
}

func (r *rep) Create(ctx context.Context, cameraType domain.CameraType, name string) (*domain.Camera, error) {
	query := `
		INSERT INTO cameras (name, type)
		VALUES ($1, $2)
		RETURNING id, name, type, updated_at
	`
	row := r.db.Pool.QueryRow(
		ctx,
		query,
		name,
		cameraType.String(),
	)
	camera, err := scanCamera2(row)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, domain.ErrorAlreadyExists
		}
		return nil, err
	}
	return camera, nil
}

func (r *rep) Update(ctx context.Context, id uuid.UUID, name string) (*domain.Camera, error) {
	query := `
		UPDATE cameras
		SET name = $2,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, type, updated_at
	`
	row := r.db.Pool.QueryRow(
		ctx,
		query,
		id,
		name,
	)
	camera, err := scanCamera2(row)
	if err != nil {
		return nil, err
	}
	return camera, nil
}

func (r *rep) Delete(ctx context.Context, id uuid.UUID) error {
	query := `
		DELETE FROM cameras
		WHERE id = $1
	`
	_, err := r.db.Pool.Exec(ctx, query, id)
	return err
}

func scanCamera(rows pgx.Rows) (*domain.Camera, error) {
	var i domain.Camera
	var cameraType string
	err := rows.Scan(
		&i.ID,
		&i.Name,
		&cameraType,
		&i.UpdatedAt,
	)
	i.Type = domain.CameraTypeFromString(cameraType)
	return &i, err
}

func scanCamera2(row pgx.Row) (*domain.Camera, error) {
	var i domain.Camera
	var cameraType string
	err := row.Scan(
		&i.ID,
		&i.Name,
		&cameraType,
		&i.UpdatedAt,
	)
	i.Type = domain.CameraTypeFromString(cameraType)
	return &i, err
}
