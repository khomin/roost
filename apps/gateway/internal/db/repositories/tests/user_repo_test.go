package repositories

import (
	"roost/internal/db/repositories"
	"testing"
)

func TestUserRepo(t *testing.T) {
	ctx, db, err := repositories.Prepare()
	if err != nil {
		t.Fatal(err)
	}

	userRepo := repositories.NewUserRepo(db)
	expectedUser := repositories.DemoUser()

	//
	// new user first
	//
	err = userRepo.EnsureExists(ctx, &expectedUser)
	if err != nil {
		t.Fatal(err)
	}

	//
	// list
	//
	resultUsers, err := userRepo.List(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(resultUsers) == 0 {
		t.Fatal("expected >= 1")
	}

	//
	// get by id
	//
	resultUser, err := userRepo.GetByID(ctx, expectedUser.ID)
	if err != nil {
		t.Fatal(err)
	}
	if resultUser.ID != expectedUser.ID {
		t.Fatal("expected correct value")
	}

	t.Log("completed")
}
