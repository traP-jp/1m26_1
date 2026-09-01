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
	lastUpdate      time.Time
	bottomMessage   time.Time
	timelineService *service.TimelineService
	traq            *TraQClient
}

func NewTimelineHandler(timelineService *service.TimelineService, traq *TraQClient) *TimelineHandler {
	return &TimelineHandler{
		lastUpdate:      time.Now(),
		bottomMessage:   time.Now(),
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

type Stamp struct {
	// Count 自然数
	Count Count `json:"count"`

	// ID UUID
	ID uuid.UUID `json:"id"`
}

type Stamps struct {
	OthersCount int     `json:"othersCount,omitempty"`
	Superior    []Stamp `json:"superior"`
}

type TimelineDetailed struct {
	MessageID  uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"userId"`
	ChannelID  uuid.UUID `json:"channelId"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
	StampCount Count     `json:"popularity"`
	Stamps     Stamps    `json:"stamps"`
}

type MessagesResponse struct {
	Content []TimelineReceived `json:"hits"`
}

type AuthorResponse struct {
	UserID uuid.UUID `json:"userId"`
}

type StampsReceived struct {
	StampID uuid.UUID `json:"stampId"`
	UserID  uuid.UUID `json:"userId"`
	Count   Count     `json:"count"`
}

func (t *TraQClient) GetActivity(ctx context.Context, token, sbp, query string) (*[]TimelineDetailed, *time.Time, *time.Time, error) {
	var res MessagesResponse
	if err := t.get(ctx, token, "/messages?bot=false&limit=100&"+query, &res); err != nil {
		return nil, nil, nil, err
	}
	res4 := res.Content
	res_d := make([]TimelineDetailed, len(res4))
	for i, v := range res4 {
		var res2 []StampsReceived
		if err := t.get(ctx, token, "/messages/"+v.MessageID.String()+"/stamps", &res2); err != nil {
			return nil, nil, nil, err
		}
		sc := 0
		sc2 := 0
		res3 := make([]Stamp, min(5, len(res2)))
		for i, v := range res2 {
			sc += v.Count
			if i < 5 {
				res3[i] = Stamp{
					ID:    v.StampID,
					Count: v.Count,
				}
			} else {
				sc2 += 1
			}
		}
		res_d[i] = TimelineDetailed{
			MessageID:  v.MessageID,
			UserID:     v.UserID,
			ChannelID:  v.ChannelID,
			Content:    v.Content,
			CreatedAt:  v.CreatedAt,
			UpdatedAt:  v.UpdatedAt,
			StampCount: sc,
			Stamps: Stamps{
				OthersCount: sc2,
				Superior:    res3,
			},
		}
	}

	if sbp == "true" {
		sort.Slice(res_d, func(i, j int) bool {
			return res_d[i].StampCount > res_d[j].StampCount
		})
	}
	u := time.Now()
	// 該当メッセージが 0 件のこともあるので、最古のメッセージ時刻は取得できた場合のみ返す。
	oldest := u
	if len(res_d) > 0 {
		oldest = res_d[len(res_d)-1].CreatedAt
	}
	return &res_d, &u, &oldest, nil
}

func (t *TraQClient) GetStamps(ctx context.Context, token, id string) (*Stamps, error) {
	var res2 []StampsReceived
	if err := t.get(ctx, token, "/messages/"+id+"/stamps", &res2); err != nil {
		return nil, err
	}
	sort.Slice(res2, func(i, j int) bool {
		return res2[i].Count > res2[j].Count
	})
	sup := make([]Stamp, min(len(res2), 5))
	ot := 0
	for i, v := range res2 {
		if i < 5 {
			sup[i] = Stamp{
				ID:    v.StampID,
				Count: v.Count,
			}
		} else {
			ot += v.Count
		}
	}
	return &Stamps{
		Superior:    sup,
		OthersCount: ot,
	}, nil
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
	if !(params.Has("SortByPopularity")) {
		return c.JSON(http.StatusBadRequest, openapi.Error{Message: "sortByPopularity is required"})
	}
	user, ok := authmiddleware.GetAuthenticatedUser(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, openapi.Error{Message: "Unauthorized"})
	}
	res, _, bm, err := h.traq.GetActivity(
		c.Request().Context(), user.Session,
		params.Get("SortByPopularity"),
		"before="+h.bottomMessage.UTC().Format(time.RFC3339),
	)
	if err != nil {
		log.Printf("get timeline: %v", err)
		return c.JSON(http.StatusBadGateway, openapi.Error{Message: "Failed to fetch the timeline from traQ"})
	}
	h.bottomMessage = *bm
	return c.JSON(http.StatusOK, *res)
}

func (h *TimelineHandler) GetIn(c echo.Context) error {
	params := c.QueryParams()
	if !(params.Has("SortByPopularity")) {
		return c.JSON(http.StatusBadRequest, openapi.Error{Message: "sortByPopularity is required"})
	}
	user, ok := authmiddleware.GetAuthenticatedUser(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, openapi.Error{Message: "Unauthorized"})
	}
	res, lu, _, err := h.traq.GetActivity(
		c.Request().Context(), user.Session,
		params.Get("SortByPopularity"),
		"after="+h.lastUpdate.UTC().Format(time.RFC3339),
	)
	if err != nil {
		log.Printf("get new messages: %v", err)
		return c.JSON(http.StatusBadGateway, openapi.Error{Message: "Failed to fetch new messages from traQ"})
	}
	h.lastUpdate = *lu
	return c.JSON(http.StatusOK, *res)
}
