package handler

import (
	"context"
	"sync"

	"github.com/coder/websocket"
	"github.com/gofrs/uuid"
)

// takusan

type WebSocketEventSender struct {
	hub *WebSocketHub
}

func NewWebSocketEventSender(hub *WebSocketHub) *WebSocketEventSender {
	return &WebSocketEventSender{hub: hub}
}

func (s *WebSocketEventSender) Send(_ context.Context, userId uuid.UUID, event any) error {
	return s.hub.Send(userId, event)
}

type WebSocketHub struct {
	mu      sync.RWMutex
	clients map[*webSocketClient]struct{}
}

func NewWebSocketHub() *WebSocketHub {
	return &WebSocketHub{
		clients: make(map[*webSocketClient]struct{}),
	}
}

func (h *WebSocketHub) Send(userId uuid.UUID, event any) error {
	h.mu.RLock()
	clients := h.clients
	clients2 := make([]*webSocketClient, 0, len(clients))
	for client := range clients {
		clients2 = append(clients2, client)
	}
	h.mu.RUnlock()

	for _, client := range clients2 {
		payload, err := marshalWebSocketEvent(event)
		if err != nil {
			return err
		}
		if !client.enqueue(payload) {
			client.close()
		}
	}
	return nil
}

type webSocketClient struct {
	hub    *WebSocketHub
	userID uuid.UUID
	conn   *websocket.Conn
	ctx    context.Context
	send   chan []byte

	mu        sync.Mutex
	closed    bool
	closeOnce sync.Once
}

func (c *webSocketClient) enqueue(payload []byte) bool {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.closed {
		return false
	}
	select {
	case c.send <- payload:
		return true
	default:
		return false
	}
}

func (c *webSocketClient) close() {
	c.closeOnce.Do(func() {
		c.mu.Lock()
		c.closed = true
		close(c.send)
		c.mu.Unlock()

		c.hub.unregister(c)
		_ = c.conn.CloseNow()
	})
}

func (h *WebSocketHub) unregister(client *webSocketClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	clients := h.clients
	if clients == nil {
		return
	}
	delete(clients, client)
}
