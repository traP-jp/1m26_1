package handler

import (
	"context"
	"log"
	"net/http"
	"sort"
	"time"

	"github.com/gofrs/uuid"
	"github.com/labstack/echo/v4"

	authmiddleware "github.com/traP-jp/1m26_1/backend/internal/middleware"
	"github.com/traP-jp/1m26_1/backend/internal/openapi"
	"github.com/traP-jp/1m26_1/backend/internal/service"
)

type TimelineHandler struct {
	timelineService *service.TimelineService
	traq            *TraQClient
}

func NewTimelineHandler(timelineService *service.TimelineService, traq *TraQClient) *TimelineHandler {
	return &TimelineHandler{
		timelineService: timelineService,
		traq:            traq,
	}
}

type TimelineReceived struct {
	MessageID uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"userId"`
	ChannelID uuid.UUID `json:"channelId"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type TimelineDetailed struct {
	MessageID  uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"userId"`
	ChannelID  uuid.UUID `json:"channelId"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
	StampCount Count     `json:"popularity"`
	Stamps     []Stamp   `json:"stamps"`
}

type MessagesResponse struct {
	Content []TimelineReceived `json:"hits"`
}

type AuthorResponse struct {
	UserID uuid.UUID `json:"userId"`
}

type Stamp struct {
	StampID   uuid.UUID `json:"stampId"`
	UserID    uuid.UUID `json:"userId"`
	Count     Count     `json:"count"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (t *TraQClient) GetActivity(ctx context.Context, token, sbp, query string) (*[]TimelineDetailed, error) {
	var res MessagesResponse
	if err := t.get(ctx, token, "/messages?bot=false&limit=100&"+query, &res); err != nil {
		return nil, err
	}
	res4 := res.Content
	res_d := make([]TimelineDetailed, len(res4))
	for i, v := range res4 {
		var res2 []Stamp
		if err := t.get(ctx, token, "/messages/"+v.MessageID.String()+"/stamps", &res2); err != nil {
			return nil, err
		}
		sc := 0
		for _, v := range res2 {
			sc += v.Count
		}
		res_d[i] = TimelineDetailed{
			MessageID:  v.MessageID,
			UserID:     v.UserID,
			ChannelID:  v.ChannelID,
			Content:    v.Content,
			CreatedAt:  v.CreatedAt,
			UpdatedAt:  v.UpdatedAt,
			StampCount: sc,
			Stamps:     res2,
		}
	}

	if sbp == "true" {
		sort.Slice(res_d, func(i, j int) bool {
			return res_d[i].StampCount > res_d[j].StampCount
		})
	}
	return &res_d, nil
}

func (t *TraQClient) GetStamps(ctx context.Context, token, id string) (*[]Stamp, error) {
	var res2 []Stamp
	if err := t.get(ctx, token, "/messages/"+id+"/stamps", &res2); err != nil {
		return nil, err
	}
	return &res2, nil
}

func (t *TraQClient) GetAuthor(ctx context.Context, token, id string) (*AuthorResponse, error) {
	var res2 AuthorResponse
	if err := t.get(ctx, token, "/messages/"+id, &res2); err != nil {
		return nil, err
	}
	return &res2, nil
}

func (h *TimelineHandler) GetTimeline(c echo.Context) error {
	params := c.QueryParams()
	if !(params.Has("sortByPopularity")) {
		return c.JSON(http.StatusBadRequest, openapi.Error{Message: "sortByPopularity is required"})
	}
	before := time.Now().UTC().Format(time.RFC3339)
	if params.Has("before") {
		before = params.Get("before")
	}
	user, ok := authmiddleware.GetAuthenticatedUser(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, openapi.Error{Message: "Unauthorized"})
	}
	res, err := h.traq.GetActivity(
		c.Request().Context(), user.Session,
		params.Get("sortByPopularity"),
		"before="+before,
	)
	if err != nil {
		log.Printf("get timeline: %v", err)
		return c.JSON(http.StatusBadGateway, openapi.Error{Message: "Failed to fetch the timeline from traQ"})
	}
	return c.JSON(http.StatusOK, *res)
}

func (h *TimelineHandler) GetIn(c echo.Context) error {
	params := c.QueryParams()
	if !(params.Has("sortByPopularity")) {
		return c.JSON(http.StatusBadRequest, openapi.Error{Message: "sortByPopularity is required"})
	}
	if !(params.Has("after")) {
		return c.JSON(http.StatusBadRequest, openapi.Error{Message: "after is required"})
	}
	user, ok := authmiddleware.GetAuthenticatedUser(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, openapi.Error{Message: "Unauthorized"})
	}
	res, err := h.traq.GetActivity(
		c.Request().Context(), user.Session,
		params.Get("sortByPopularity"),
		"after="+params.Get("after"),
	)
	if err != nil {
		log.Printf("get new messages: %v", err)
		return c.JSON(http.StatusBadGateway, openapi.Error{Message: "Failed to fetch new messages from traQ"})
	}
	return c.JSON(http.StatusOK, *res)
}
