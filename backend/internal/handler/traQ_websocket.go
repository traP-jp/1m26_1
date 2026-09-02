package handler

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/coder/websocket"
)

type ExternalWebSocketClient struct {
	hub *WebSocketHub
	// token は traQ のアクセストークン。traQ の API v3 は OAuth2 / Bearer 認証で
	// アクセスする（r_session クッキーは traQ 本体の Web クライアント用の
	// セッションであり、別オリジンの本アプリには届かない）。
	token string
	traq  *TraQClient
}

type WebSocketEvent struct {
	Type string `json:"type"`
	Body any    `json:"body"`
}

type WebSocketEventReceived struct {
	Type string `json:"type"`
	Body string `json:"body"`
}

type SimplestBody struct {
	Id string `json:"id"`
}

type SimpleBody struct {
	Id string `json:"message_id"`
}

func NewExternalWebSocketClient(hub *WebSocketHub, token string, traq *TraQClient) *ExternalWebSocketClient {
	return &ExternalWebSocketClient{
		hub:   hub,
		token: token,
		traq:  traq,
	}
}

func (c *ExternalWebSocketClient) Run(ctx context.Context) error {
	header := http.Header{}
	header.Set("Authorization", "Bearer "+c.token)

	conn, _, err := websocket.Dial(ctx, c.traq.WebSocketURL(), &websocket.DialOptions{
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

		var received WebSocketEventReceived

		json.Unmarshal(data, &received)

		var data2 []byte
		switch received.Type {
		case "MESSAGE_CREATED":
			var id SimplestBody
			json.Unmarshal([]byte(received.Body), &id)
			author, err := c.traq.GetAuthor(ctx, c.token, id.Id)
			if err != nil {
				return err
			}
			data3 := WebSocketEvent{
				Type: "MessageCreated",
				Body: author.UserID,
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
				Type: "StampInfoUpdated",
				Body: id.Id,
			}
			data2, err = json.Marshal(data3)
		case "MESSAGE_STAMPED":
			var id SimpleBody
			json.Unmarshal([]byte(received.Body), &id)
			res, err := c.traq.GetStamps(ctx, c.token, id.Id)
			if err != nil {
				return err
			}
			data3 := WebSocketEvent{
				Type: "StampUpdated",
				Body: *res,
			}
			data2, err = json.Marshal(data3)
		case "MESSAGE_UNSTAMPED":
			var id SimpleBody
			json.Unmarshal([]byte(received.Body), &id)
			res, err := c.traq.GetStamps(ctx, c.token, id.Id)
			if err != nil {
				return err
			}
			data3 := WebSocketEvent{
				Type: "StampUpdated",
				Body: *res,
			}
			data2, err = json.Marshal(data3)
		}

		// WS 処理

		c.hub.broadcast(data2)
	}
}
