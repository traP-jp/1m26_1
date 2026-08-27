package handler

import (
	"context"
	"net/http"

	"github.com/coder/websocket"
)

type ExternalWebSocketClient struct {
	hub    *WebSocketHub
	cookie *http.Cookie
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

		// 外部APIから受け取ったデータを処理
		// ...

		c.hub.broadcast(data)
	}
}
