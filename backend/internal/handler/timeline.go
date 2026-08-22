package handler

import (
	"encoding/json"
	"net/http"
	"sort"
	"time"

	"github.com/gofrs/uuid"
	"github.com/labstack/echo/v4"
)

type TimelineHandler struct {
	lastUpdate time.Time
}

func NewTimelineHandler() *TimelineHandler {
	return &TimelineHandler{
		lastUpdate: time.Now(),
	}
}

type TimelineReceived struct {
	MessageID uuid.UUID `json:"id"`
	UserID uuid.UUID `json:"userId"`
	ChannelID uuid.UUID `json:"channelId"`
	Content string `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type TimelineResponse struct {
	Messages []uuid.UUID `json:"messages"`
}

func GetActivity(sbp, all string) (*[]TimelineReceived, error) {
	result, err := http.NewRequest("GET", "https://q.trap.jp/api/v3/activity/timeline?all=" + all, nil)
	if err != nil {
		return nil, err
	}
	defer result.Body.Close()
	var res []TimelineReceived
	json.NewDecoder(result.Body).Decode(&res)
	if sbp == "true" {
		sort.Slice(res, func(i, j int) bool {
			return res[i].CreatedAt.After(res[j].CreatedAt)
		})
	}
	return &res, nil
}

func (h *TimelineHandler) GetTimeline(c echo.Context) error {
	params := c.QueryParams()
	if !(params.Has("sortByPopularity")||params.Has("all")) {
		return c.JSON(http.StatusBadRequest, nil)
	}
	res, err := GetActivity(params.Get("sortByPopularity"), params.Get("all"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, nil)
	}
	result := make([]uuid.UUID, len(*res))
	for i, v := range *res {
		result[i] = v.MessageID
	}
	return c.JSON(http.StatusOK, TimelineResponse {
		Messages: result,
	})
}

func (H *TimelineHandler) GetIn(c echo.Context) error {
	return nil
}