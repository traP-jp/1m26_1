package handler

import (
	"net/http"

	"github.com/gofrs/uuid"

	"github.com/labstack/echo/v4"

	authmiddleware "github.com/traP-jp/1m26_1/backend/internal/middleware"
)

type UserHandler struct{}

type UserQuery struct {
	ID uuid.UUID `json:"id"`
}

type UserResponse struct {
	ID     uuid.UUID `json:"id"`
	UserID string    `json:"userId"`
	Name   string    `json:"name"`
}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
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
	ID *uuid.UUID `json:"id,omitempty"`

	// MessageCount 自然数
	MessageCount *Count `json:"messageCount,omitempty"`

	// Name ユーザー名
	Name *UserName `json:"name,omitempty"`

	// StampCount 自然数
	StampCount *Count `json:"stampCount,omitempty"`

	// UserID ユーザーの ID
	UserID UserID `json:"userId"`
}

func (h *UserHandler) GetMe(c echo.Context) error {
	user, ok := authmiddleware.GetAuthenticatedUser(c)
	if !ok {
		return c.NoContent(http.StatusUnauthorized)
	}
	return c.JSON(http.StatusOK, UserResponse{
		UserID: user.UserId,
		Name:   user.Name,
		ID:     user.Id,
	})
}

func (h *UserHandler) GetUser(c echo.Context) error {
	var user UserQuery
	if err := c.Bind(&user); err != nil {
		return c.JSON(http.StatusInternalServerError, nil)
	}
	return c.JSON(http.StatusOK, UserProfile{
		ID: &(user.ID),
		// uuid から traQ で API たたきますよ
	})
}