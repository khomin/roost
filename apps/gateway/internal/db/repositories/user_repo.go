package repositories

import (
	"context"
	"roost/internal/core"
	"roost/internal/core/domain"
	"roost/internal/db"
)

type userRepo struct {
	db *db.DataBase
}

func NewUserRepo(db *db.DataBase) core.UserRepo {
	return &userRepo{db: db}
}

func (r *userRepo) List(ctx context.Context) ([]domain.User, error) {
	query := `SELECT id, name, email FROM users`
	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []domain.User{}
	for rows.Next() {
		var i domain.User
		err = rows.Scan(
			&i.ID,
			&i.Name,
			&i.Email,
		)
		if err != nil {
			return nil, err
		}
		out = append(out, i)
	}
	return out, nil
}

func (r *userRepo) EnsureExists(ctx context.Context, user *domain.User) error {
	queryUser := `
		INSERT INTO users (id, name, email) 
		VALUES ($1, $2, $3)
		ON CONFLICT (id)
		DO NOTHING
	`
	queryGroup := `
		INSERT INTO user_groups (user_id, group_id, assigned_by)
        VALUES ($1, 'default', NULL)
        ON CONFLICT (user_id, group_id) DO NOTHING
	`
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	_, err = tx.Exec(ctx, queryUser,
		user.ID,
		user.Name,
		user.Email,
	)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, queryGroup,
		user.ID,
	)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *userRepo) GetByID(ctx context.Context, userID string) (*domain.User, error) {
	query := `
		SELECT id, name, email FROM users
		WHERE id = $1
	`
	row := r.db.Pool.QueryRow(ctx, query, userID)
	var i domain.User
	err := row.Scan(
		&i.ID,
		&i.Name,
		&i.Email,
	)
	if err != nil {
		return nil, err
	}
	return &i, nil
}
