package handler

import (
	"encoding/json"
	"fmt"

	"github.com/traP-jp/1m26_1/backend/internal/openapi"
)

func marshalWebSocketEvent(event any) ([]byte, error) {
	payload, err := (func(event any) ([]byte, error) {
		openapiEvent, err := (func(event any) (openapi.UserWebSocketEvent, error) {
			if wrapped, ok := event.(openapi.UserWebSocketEvent); ok {
				return wrapped, nil
			}
			var result openapi.UserWebSocketEvent
			var err error
			switch event := event.(type) {
			case openapi.InitializedEvent:
				err = result.FromInitializedEvent(event)
			case openapi.CountReachingThresholdEvent:
				err = result.FromCountReachingThresholdEvent(event)
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
				return result, fmt.Errorf("%T is not a WebSocket event schema", event)
			}
			return result, err
		})(event)
		if err != nil {
			return nil, err
		}
		payload, err := json.Marshal(openapiEvent)
		return payload, err
	})(event)
	if err != nil {
		return nil, err
	}
	return payload, nil
}
