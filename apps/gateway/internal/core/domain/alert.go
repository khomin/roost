package domain

import (
	"time"
)

type Alert struct {
	ID          string
	UserID      string
	CoinSymbol  string
	Condition   string
	Price       float64
	Enabled     bool
	TriggeredAt *time.Time
	UpdatedAt   time.Time
	CreatedAt   time.Time
}

type AlertUpdate struct {
	Condition string
	Price     float64
}

const (
	AlertConditionAbove = "above"
	AlertConditionBelow = "below"
)
