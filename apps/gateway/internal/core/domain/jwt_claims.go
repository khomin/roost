package domain

type JwtClaims struct {
	Subject string `json:"sub"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	IsDemo  bool   `json:"is_demo"`
}

type JwtDeviceRefreshClaims struct {
	ID string `json:"id"`
}
