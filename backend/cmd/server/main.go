package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"github.com/traP-jp/1m26_1/backend/internal/config"
	"github.com/traP-jp/1m26_1/backend/internal/server"
)

func main() {
	// .env はローカル開発用。存在しない環境（本番など）では無視する。
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		slog.Warn("failed to load .env", slog.Any("error", err))
	}

	cfg := config.Load()
	e := server.New(cfg)

	go func() {
		if err := e.Start(cfg.Addr()); err != nil && !errors.Is(err, http.ErrServerClosed) {
			e.Logger.Fatalf("failed to start server: %v", err)
		}
	}()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := e.Shutdown(shutdownCtx); err != nil {
		slog.Error("failed to shutdown server", slog.Any("error", err))
	}
}
