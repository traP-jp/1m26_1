package handler

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/coder/websocket"
)

type ExternalWebSocketClient struct {
	hub    *WebSocketHub
	cookie *http.Cookie
}

type WebSocketEvent struct {
	Type string `json:"type"`
	Body string `json:"body"`
}

type SimplestBody struct {
	Id string `json:"id"`
}

func NewExternalWebSocketClient(hub *WebSocketHub, cookie *http.Cookie) *ExternalWebSocketClient {
	return &ExternalWebSocketClient{
		hub:    hub,
		cookie: cookie,
	}
}

func (c *ExternalWebSocketClient) Run(ctx context.Context) error {
	header := http.Header{}
	header.Set("Cookie", c.cookie.String())

	conn, _, err := websocket.Dial(ctx, "https://q.trap.jp/api/ws", &websocket.DialOptions{
		HTTPHeader: header,
	})
	if err != nil {
		return err
	}
	defer conn.Close(websocket.StatusNormalClosure, "")

	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			return err
		}

		var received WebSocketEvent

		json.Unmarshal(data, &received)

		var data2 []byte
		switch received.Type {
		case "MESSAGE_CREATED":
			data3 := WebSocketEvent{
				Type: "MessageCreated",
				Body: "1",
			}
			data2, err = json.Marshal(data3)
		case "MESSAGE_DELETED":
			var id SimplestBody
			json.Unmarshal([]byte(received.Body), &id)
			data3 := WebSocketEvent{
				Type: "MessageDeleted",
				Body: id.Id,
			}
			data2, err = json.Marshal(data3)
		case "MESSAGE_UPDATED":
			var id SimplestBody
			json.Unmarshal([]byte(received.Body), &id)
			data3 := WebSocketEvent{
				Type: "MessageEdited",
				Body: id.Id,
			}
			data2, err = json.Marshal(data3)
		case "USER_UPDATED":
			var id SimplestBody
			json.Unmarshal([]byte(received.Body), &id)
			data3 := WebSocketEvent{
				Type: "UserUpdated",
				Body: id.Id,
			}
			data2, err = json.Marshal(data3)
		case "STAMP_UPDATED":
			var id SimplestBody
			json.Unmarshal([]byte(received.Body), &id)
			data3 := WebSocketEvent{
				Type: "StampUpdated",
				Body: id.Id,
			}
			data2, err = json.Marshal(data3)
		}

		// WS 処理

		c.hub.broadcast(data2)
	}
}
