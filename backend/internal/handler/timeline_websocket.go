package handler

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/gofrs/uuid"
	"github.com/labstack/echo/v4"
	authmiddleware "github.com/traP-jp/1m26_1/backend/internal/middleware"
	"github.com/traP-jp/1m26_1/backend/internal/openapi"
	"github.com/traP-jp/1m26_1/backend/internal/service"
)

// takusan

type WebSocketEventSender struct {
	hub *WebSocketHub
}

type TimelineWebSocketHandler struct {
	timelineService *service.TimelineService
	hub             *WebSocketHub
	originPatterns  []string
}

func NewTimelineWebSocketHandler(timelineService *service.TimelineService, hub *WebSocketHub, originPatterns []string) *TimelineWebSocketHandler {
	return &TimelineWebSocketHandler{
		timelineService: timelineService,
		hub:             hub,
		originPatterns:  append([]string(nil), originPatterns...),
	}
}

func (h *TimelineWebSocketHandler) Connect(c echo.Context) error {
	user, ok := authmiddleware.GetAuthenticatedUser(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, nil)
	}
	userID := uuid.UUID(user.Id)
	initialEvent, err := buildInitializedEvent()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, openapi.Error{Message: "Internal Server Error"})
	}
	initialPayload, err := marshalWebSocketEvent(initialEvent)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, openapi.Error{Message: "Internal Server Error"})
	}
	conn, err := websocket.Accept(c.Response(), c.Request(), &websocket.AcceptOptions{
		OriginPatterns: h.originPatterns,
	})
	if err != nil {
		return nil
	}
	ctx := conn.CloseRead(context.Background())

	client := &webSocketClient{
		hub:    h.hub,
		userID: userID,
		conn:   conn,
		ctx:    ctx,
		send:   make(chan []byte, 16),
	}
	if !client.enqueue(initialPayload) {
		client.close()
		return nil
	}
	h.hub.register(client)
	go client.writeLoop()

	<-ctx.Done()
	client.close()
	return nil
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

func (h *WebSocketHub) broadcast(payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		client.enqueue(payload)
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

func (c *webSocketClient) writeLoop() {
	for payload := range c.send {
		ctx, cancel := context.WithTimeout(c.ctx, 10*time.Second)
		err := c.conn.Write(ctx, websocket.MessageText, payload)
		cancel()
		if err != nil {
			break
		}
	}
	c.close()
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

func (h *WebSocketHub) register(client *webSocketClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.clients[client] = struct{}{}
}

func buildInitializedEvent() (any, error) {
	return openapi.InitializedEvent{
		Type: openapi.InitializedEventTypeInitialized,
	}, nil
}
