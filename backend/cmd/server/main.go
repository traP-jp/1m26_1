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

	"github.com/traP-jp/1m26_1/backend/internal/config"
	"github.com/traP-jp/1m26_1/backend/internal/server"
)

func main() {
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
