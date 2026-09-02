package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/traP-jp/1m26_1/backend/internal/config"
	"github.com/traP-jp/1m26_1/backend/internal/openapi"
)

type OAuthHandler struct {
	hub    *WebSocketHub
	cfg    config.Config
	traq   *TraQClient
	client *http.Client

	// externalWSClose は traQ への WebSocket 接続を張り直すときに
	// 直前の接続を止めるためのもの。ログインのたびに接続が増えるのを防ぐ。
	mu              sync.Mutex
	externalWSClose context.CancelFunc
}

func NewOAuthHandler(hub *WebSocketHub, cfg config.Config, traq *TraQClient) *OAuthHandler {
	return &OAuthHandler{
		hub:    hub,
		cfg:    cfg,
		traq:   traq,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

type OAuthResponse struct {
	AccessToken  string  `json:"access_token"`
	ExpiresIn    int     `json:"expires_in"`
	RefreshToken *string `json:"refresh_token,omitempty"`

	// TokenType Example: Bearer
	TokenType string `json:"token_type"`

	// Scope は要求より狭められた場合にのみ traQ から返る。
	Scope string `json:"scope,omitempty"`
	// IDToken は openid スコープを要求した場合にのみ返る JWT。
	IDToken string `json:"id_token,omitempty"`
}

type ReqBody struct {
	Code         string `json:"code"`
	CodeVerifier string `json:"code_verifier"`
}

// exchangeCode は認可コードをアクセストークンと交換する。
// traQ のトークンエンドポイントは x-www-form-urlencoded のボディを読むため、
// クエリ文字列ではなくフォームとして送る必要がある。
func (h *OAuthHandler) exchangeCode(ctx context.Context, code, codeVerifier string) (*OAuthResponse, error) {
	// 未設定のまま traQ に投げると、原因の分かりにくい invalid_client (400) が返る。
	if h.cfg.TraQClientID == "" {
		return nil, errors.New("TRAQ_CLIENT_ID is not configured")
	}

	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("client_id", h.cfg.TraQClientID)
	form.Set("code", code)
	if codeVerifier != "" {
		form.Set("code_verifier", codeVerifier)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		h.cfg.TraQBaseURL+"/oauth2/token",
		strings.NewReader(form.Encode()),
	)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	// confidential クライアントとして登録されている場合のみクライアント認証を付ける。
	if h.cfg.TraQClientSecret != "" {
		req.SetBasicAuth(h.cfg.TraQClientID, h.cfg.TraQClientSecret)
	}

	res, err := h.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	body, err := io.ReadAll(io.LimitReader(res.Body, maxTraQErrorBodySize))
	if err != nil {
		return nil, fmt.Errorf("read token response: %w", err)
	}
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("traQ token endpoint returned %d: %s", res.StatusCode, strings.TrimSpace(string(body)))
	}

	var token OAuthResponse
	if err := json.Unmarshal(body, &token); err != nil {
		return nil, fmt.Errorf("decode token response: %w", err)
	}
	if token.AccessToken == "" {
		return nil, errors.New("traQ returned an empty access_token")
	}
	return &token, nil
}

// startExternalWebSocket は traQ の通知ストリームへの接続を張り直す。
// 直前の接続があれば先に止める。
func (h *OAuthHandler) startExternalWebSocket(token string) {
	ctx, cancel := context.WithCancel(context.Background())

	h.mu.Lock()
	if h.externalWSClose != nil {
		h.externalWSClose()
	}
	h.externalWSClose = cancel
	h.mu.Unlock()

	externalWS := NewExternalWebSocketClient(h.hub, token, h.traq)
	go func() {
		defer cancel()
		if err := externalWS.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
			log.Printf("external websocket: %v", err)
		}
	}()
}

func (h *OAuthHandler) OAuth(c echo.Context) error {
	var data ReqBody
	if err := c.Bind(&data); err != nil {
		return c.JSON(http.StatusBadRequest, openapi.Error{Message: "Invalid request body"})
	}
	if data.Code == "" {
		return c.JSON(http.StatusBadRequest, openapi.Error{Message: "code is required"})
	}

	token, err := h.exchangeCode(c.Request().Context(), data.Code, data.CodeVerifier)
	if err != nil {
		// traQ が返した理由はサーバログにのみ残し、クライアントには概要だけ返す。
		log.Printf("oauth token exchange failed: %v", err)
		return c.JSON(http.StatusForbidden, openapi.Error{Message: "Failed to exchange the authorization code"})
	}

	h.startExternalWebSocket(token.AccessToken)

	return c.JSON(http.StatusOK, *token)
}
