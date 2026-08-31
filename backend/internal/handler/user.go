package handler

import (
	"encoding/json"
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
	ID     string `json:"id"`
	UserId string `json:"userId"`
	Name   string `json:"name"`
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
		return c.NoContent(http.StatusUnauthorized)
	}

	return c.JSON(http.StatusOK, UserResponse{
		UserId: user.UserId,
		ID:     user.Id.String(),
		Name:   user.Name,
	})
}

func (h *UserHandler) GetUser(c echo.Context) error {
	user := c.Param("userId")
	req, err := http.NewRequest("GET", "https://q.trap.jp/api/v3/users/"+user, nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, nil)
	}
	result, err3 := http.DefaultClient.Do(req)
	if err3 != nil {
		return c.JSON(http.StatusUnauthorized, nil)
	}
	defer result.Body.Close()
	var res UserProfileReceived
	json.NewDecoder(result.Body).Decode(&res)
	req2, err2 := http.NewRequest("GET", "https://q.trap.jp/api/v3/messages?from="+user, nil)
	if err2 != nil {
		return c.JSON(http.StatusBadRequest, nil)
	}
	result2, err4 := http.DefaultClient.Do(req2)
	if err4 != nil {
		return c.JSON(http.StatusInternalServerError, nil)
	}
	defer result2.Body.Close()
	var res2 MessageCount
	json.NewDecoder(result2.Body).Decode(&res2)
	res3 := 0
	return c.JSON(http.StatusOK, UserProfile{
		ID:           res.ID,
		UserID:       res.UserID,
		Name:         res.Name,
		StampCount:   res3, // StampCount あとでやるぞ
		MessageCount: res2.MessageCount,
	})
}
