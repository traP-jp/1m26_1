package handler

import (
	"log"
	"net/http"
	"net/url"

	"github.com/gofrs/uuid"
	"github.com/labstack/echo/v4"

	authmiddleware "github.com/traP-jp/1m26_1/backend/internal/middleware"
	"github.com/traP-jp/1m26_1/backend/internal/openapi"
)

type UserHandler struct {
	traq *TraQClient
}

type UserResponse struct {
	ID     string `json:"id"`
	UserId string `json:"userId"`
	Name   string `json:"name"`
}

func NewUserHandler(traq *TraQClient) *UserHandler {
	return &UserHandler{traq: traq}
}

// UserID ユーザーの ID
type UserID = string

// UserName ユーザー名
type UserName = string

// Count 自然数
type Count = int

// UserProfile defines model for UserProfile.
type UserProfile struct {
	// ID UUID
	ID uuid.UUID `json:"id,omitempty"`

	// MessageCount 自然数
	MessageCount Count `json:"messageCount,omitempty"`

	// Name ユーザー名
	Name UserName `json:"name,omitempty"`

	// StampCount 自然数
	StampCount Count `json:"stampCount,omitempty"`

	// UserID ユーザーの ID
	UserID UserID `json:"userId"`
}

type UserProfileReceived struct {
	ID     uuid.UUID `json:"id"`
	UserID UserID    `json:"name"`
	Name   UserName  `json:"displayName"`
}

type MessageCount struct {
	MessageCount Count `json:"totalHits"`
}

func (h *UserHandler) GetMe(c echo.Context) error {
	user, ok := authmiddleware.GetAuthenticatedUser(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, openapi.Error{Message: "Unauthorized"})
	}

	return c.JSON(http.StatusOK, UserResponse{
		UserId: user.UserId,
		ID:     user.Id.String(),
		Name:   user.Name,
	})
}

func (h *UserHandler) GetUser(c echo.Context) error {
	auth, ok := authmiddleware.GetAuthenticatedUser(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, openapi.Error{Message: "Unauthorized"})
	}

	ctx := c.Request().Context()
	userID := c.Param("userId")

	var res UserProfileReceived
	if err := h.traq.get(ctx, auth.Session, "/users/"+url.PathEscape(userID), &res); err != nil {
		log.Printf("get user %s: %v", userID, err)
		return c.JSON(http.StatusBadGateway, openapi.Error{Message: "Failed to fetch the user from traQ"})
	}

	var res2 MessageCount
	if err := h.traq.get(ctx, auth.Session, "/messages?from="+url.QueryEscape(userID), &res2); err != nil {
		log.Printf("get message count for %s: %v", userID, err)
		return c.JSON(http.StatusBadGateway, openapi.Error{Message: "Failed to fetch the message count from traQ"})
	}

	return c.JSON(http.StatusOK, UserProfile{
		ID:           res.ID,
		UserID:       res.UserID,
		Name:         res.Name,
		StampCount:   0, // StampCount あとでやるぞ
		MessageCount: res2.MessageCount,
	})
}

type meResponse struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	DisplayName string    `json:"displayName"`
}

// ResolveUserByToken はアクセストークンから traQ 上のユーザーを引く。
// リバースプロキシが X-Forwarded-User を注入しない環境（ローカル開発など）で
// 認証ミドルウェアから使われる。
func (t *TraQClient) ResolveUserByToken(c echo.Context, token string) (authmiddleware.AuthenticatedUser, error) {
	var me meResponse
	if err := t.get(c.Request().Context(), token, "/users/me", &me); err != nil {
		return authmiddleware.AuthenticatedUser{}, err
	}
	return authmiddleware.AuthenticatedUser{
		Id:     me.ID,
		UserId: me.Name,
		Name:   me.DisplayName,
	}, nil
}
