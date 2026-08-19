package handler

import (
	"net/http"

	"github.com/gofrs/uuid"

	"github.com/labstack/echo/v4"

	authmiddleware "github.com/traP-jp/1m26_1/backend/internal/middleware"
)

type UserHandler struct{}

type UserResponse struct {
	ID     uuid.UUID `json:"id"`
	UserID string    `json:"userId"`
	Name   string    `json:"name"`
}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
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
