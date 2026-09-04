package service

import (
	"context"

	"github.com/gofrs/uuid"
)

type EventSender interface {
	Send(ctx context.Context, userId uuid.UUID, event any) error
}
