package docs

import (
	"embed"
	"net/http"
)

// Embeds the index.html and all nested openapiv2 JSON files recursively
//
//go:embed index.html openapiv2
var docsFS embed.FS

// Handler serves static files from the embedded filesystem
func Handler() http.Handler {
	return http.FileServer(http.FS(docsFS))
}
