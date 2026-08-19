package handler

import (
	"fmt"

	"github.com/traP-jp/1m26_1/backend/internal/openapi"
)

func marshalWebSocketEvent(event any) (openapi.UserWebSocketEvent, bool, error) {
	if wrapped, ok := event.(openapi.UserWebSocketEvent); ok {
		return wrapped, false, nil
	}
	var result openapi.UserWebSocketEvent
	var err error
	switch event := event.(type) {
	case openapi.MessageCreatedEvent:
		err = result.FromMessageCreatedEvent(event)
	case openapi.MessageDeletedEvent:
		err = result.FromMessageDeletedEvent(event)
	case openapi.MessageEditedEvent:
		err = result.FromMessageEditedEvent(event)
	case openapi.StampImageReplacedEvent:
		err = result.FromStampImageReplacedEvent(event)
	case openapi.StampInfoChangedEvent:
		err = result.FromStampInfoChangedEvent(event)
	case openapi.StampUpdatedEvent:
		err = result.FromStampUpdatedEvent(event)
	case openapi.UserIconReplacedEvent:
		err = result.FromUserIconReplacedEvent(event)
	case openapi.UsernameChangedEvent:
		err = result.FromUsernameChangedEvent(event)
	default:
		return result, false, fmt.Errorf("%T is not a WebSocket event schema", event)
	}
	return result, true, err
}