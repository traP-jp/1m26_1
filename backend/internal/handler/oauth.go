package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
)

type OAuthHandler struct {
	hub *WebSocketHub
}

func NewOAuthHandler() *OAuthHandler {
	wsh := NewWebSocketHub()
	return &OAuthHandler{
		hub: wsh,
	}
}

type OAuthResponse struct {
	AccessToken  string  `json:"access_token"`
	ExpiresIn    int     `json:"expires_in"`
	RefreshToken *string `json:"refresh_token,omitempty"`

	// TokenType Example: Bearer
	TokenType string `json:"token_type"`
}

type ReqBody struct {
	Code string `json:"code"`
}

func sendRequset(code string) (*OAuthResponse, error) {
	req, err := http.NewRequest("POST", "https://q.trap.jp/oauth2/token?grant_type=authorization_code&client_id=dN8CR7tqtHtFRYwzZod1MzvrkLRtkCpop5GC&code="+code, nil)
	if err != nil {
		return nil, err
	}
	res2, err2 := http.DefaultClient.Do(req)
	if err2 != nil {
		return nil, err2
	}
	defer res2.Body.Close()
	var res OAuthResponse
	json.NewDecoder(res2.Body).Decode(&res)
	return &res, nil
}

func (h *OAuthHandler) OAuth(c echo.Context) error {
	var data ReqBody
	if err := c.Bind(&data); err != nil {
		return c.JSON(http.StatusInternalServerError, nil)
	}
	res, err2 := sendRequset(data.Code)
	if err2 != nil {
		return c.JSON(http.StatusForbidden, nil)
	}
	cookie, err3 := c.Cookie("r_session")
	if err3 != nil {
		return c.JSON(http.StatusUnauthorized, nil)
	}
	externalWS := NewExternalWebSocketClient(h.hub, cookie)

	go func() {
		if err := externalWS.Run(c.Request().Context()); err != nil {
			log.Printf("external websocket: %v", err)
		}
	}()
	return c.JSON(http.StatusOK, *res)
}
