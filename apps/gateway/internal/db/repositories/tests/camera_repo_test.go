package repositories

// import (
// 	"roost/internal/core"
// 	"testing"
// 	"time"

// 	"github.com/google/uuid"
// )

// func TestWalletRepo(t *testing.T) {
// 	ctx, db, err := Prepare()
// 	if err != nil {
// 		t.Fatal(err)
// 	}

// 	repo := NewWalletRepository(db)
// 	userRepo := NewUserRepo(db)

// 	expectedUser := DemoUser()

// 	//
// 	// new user first
// 	//
// 	err = userRepo.EnsureExists(ctx, &expectedUser)
// 	if err != nil {
// 		t.Fatal(err)
// 	}

// 	//
// 	// delete from previous tests
// 	//
// 	resultList, err := repo.ListWalletsByUser(ctx, expectedUser.ID)
// 	if err != nil {
// 		t.Fatal(err)
// 	}
// 	for _, i := range resultList {
// 		id, _ := uuid.Parse(i.ID)
// 		repo.Delete(ctx, expectedUser.ID, id)
// 	}

// 	//
// 	// create
// 	//
// 	resultCreate, err := repo.Create(ctx, expectedUser.ID, "ETH", "0xEC2dFb47E5AA06da508D816D83b4833f6eBE9532", "ETH", "Test")
// 	if err != nil {
// 		t.Fatal(err)
// 	}
// 	if resultCreate.ID == "" || resultCreate.UserID != expectedUser.ID || resultCreate.Symbol != "ETH" || resultCreate.Address != "0xEC2dFb47E5AA06da508D816D83b4833f6eBE9532" {
// 		t.Fatal("expected correct value")
// 	}

// 	id, _ := uuid.Parse(resultCreate.ID)

// 	//
// 	// update
// 	//
// 	resultUpdate, err := repo.Update(ctx, expectedUser.ID, id, core.UpdateWallet{
// 		Label:  "Test updated",
// 		Notify: false,
// 	})
// 	if err != nil {
// 		t.Fatal(err)
// 	}
// 	if resultUpdate.ID == "" || resultUpdate.UserID != expectedUser.ID || resultUpdate.Symbol != "ETH" || resultUpdate.Address != "0xEC2dFb47E5AA06da508D816D83b4833f6eBE9532" || resultUpdate.Label != "Test updated" || resultUpdate.Notify != false {
// 		t.Fatal("expected correct value")
// 	}

// 	//
// 	// update balance
// 	//
// 	balanceCrypto := 123.0
// 	balanceUSD := 456.0
// 	balanceTime := time.Now().Add(-time.Hour * 24)
// 	for i := 0; i < 100; i++ {
// 		err = repo.UpdateBalanceSnapshot(ctx, id, core.BalanceSnapshot{
// 			Crypto: balanceCrypto,
// 			USD:    balanceUSD,
// 			Time:   balanceTime,
// 		})
// 		if err != nil {
// 			t.Fatal(err)
// 		}
// 		balanceCrypto += 10
// 		balanceUSD += 10
// 		balanceTime = balanceTime.Add(time.Minute * 10)
// 	}

// 	//
// 	// get snapshot
// 	//
// 	resultSnapshots, err := repo.ListBalanceSnapshots(ctx, id, core.BalanceSnapshotFilter{
// 		From:  time.Now().Add(-time.Hour * 24),
// 		To:    time.Now(),
// 		Limit: 10,
// 	})
// 	if err != nil {
// 		t.Fatal(err)
// 	}
// 	if len(resultSnapshots) == 0 {
// 		t.Fatal("expected > 1")
// 	}

// 	//
// 	// get by user
// 	//
// 	resultGet, err := repo.GetWalletByUser(ctx, expectedUser.ID, id)
// 	if err != nil {
// 		t.Fatal(err)
// 	}
// 	if resultGet.ID == "" || resultGet.UserID != expectedUser.ID || resultGet.Symbol != "ETH" {
// 		t.Fatal("expected correct value")
// 	}

// 	//
// 	// list
// 	//
// 	resultList, err = repo.ListWalletsByUser(ctx, expectedUser.ID)
// 	if err != nil {
// 		t.Fatal(err)
// 	}
// 	if len(resultList) == 0 {
// 		t.Fatal("expected >= 1")
// 	}

// 	//
// 	// get users using this wallet
// 	//
// 	resultUserWallets, err := repo.ListUsersByWallet(ctx, id)
// 	if err != nil {
// 		t.Fatal(err)
// 	}
// 	if len(resultUserWallets) == 0 {
// 		t.Fatal("expected >= 1")
// 	}

// 	//
// 	// one
// 	//
// 	resultSnapshot, err := repo.GetBalanceSnapshot(ctx, id)
// 	if err != nil {
// 		t.Fatal(err)
// 	}
// 	if resultSnapshot.Time.IsZero() {
// 		t.Fatal("expected correct time")
// 	}

// 	//
// 	// list for sync
// 	//
// 	_, err = repo.ListForSync(ctx, time.Now().Add(-5*time.Minute), 100)
// 	if err != nil {
// 		t.Fatal(err)
// 	}

// 	//
// 	// delete
// 	//
// 	err = repo.Delete(ctx, expectedUser.ID, id)
// 	if err != nil {
// 		t.Fatal(err)
// 	}

// 	t.Log("completed")
// }
