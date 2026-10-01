package bootstrap

import (
	"io"
	"log/slog"
	"os"
	"path/filepath"

	"gopkg.in/natefinch/lumberjack.v2"
)

type Application struct {
	Cfg     *Config
	LogFile *os.File
	Logger  *slog.Logger
}

func App() Application {
	app := &Application{}
	app.Cfg = NewConfig()
	app.NewLog()
	return *app
}

func (a *Application) NewLog() *slog.Logger {
	lumberjackLogger := &lumberjack.Logger{
		Filename:   filepath.ToSlash(a.Cfg.Server.LogPath),
		MaxSize:    1, // MB
		MaxBackups: 2,
		MaxAge:     3, // days
		Compress:   true,
	}
	multiWriter := io.MultiWriter(os.Stderr, lumberjackLogger)

	var level slog.Level
	var handler slog.Handler
	if a.Cfg.Server.Environment == "dev" {
		level = slog.LevelDebug
	} else {
		level = slog.LevelWarn
	}
	if a.Cfg.Server.Environment == "dev" {
		handler = slog.NewTextHandler(multiWriter, &slog.HandlerOptions{
			Level:     level,
			AddSource: false,
		})
	} else {
		handler = slog.NewJSONHandler(multiWriter, &slog.HandlerOptions{
			Level:     level,
			AddSource: false,
		})
	}
	logger := slog.New(handler)
	slog.SetDefault(logger)
	return logger
}
