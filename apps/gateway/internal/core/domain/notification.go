package domain

import "encoding/json"

type NotificationType string

const (
	NotificationPriceAlert   NotificationType = "price_alert"
	NotificationBalanceAlert NotificationType = "balance_alert"
)

type NotificationCommand struct {
	UserID   string           `json:"user_id"`
	Email    string           `json:"email"`
	UserName string           `json:"user_name"`
	Type     NotificationType `json:"type"`
	Payload  json.RawMessage  `json:"payload"`
}

type PriceAlertNotification struct {
	AlertID    string  `json:"alert_id"`
	CoinName   string  `json:"coin_name"`
	CoinSymbol string  `json:"coin_symbol"`
	Price      float64 `json:"price"`
}

type BalanceAlertNotification struct {
	Name       string  `json:"name"`
	CoinSymbol string  `json:"coin_symbol"`
	Previous   float64 `json:"previous"`
	Current    float64 `json:"current"`
	Delta      float64 `json:"delta"`
}
