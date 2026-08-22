package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gofrs/uuid"
	"github.com/labstack/echo/v4"
	"google.golang.org/genproto/googleapis/type/datetime"
)

type TimelineHandler struct {}

func NewTimelineHandler() *TimelineHandler {
	return &TimelineHandler{}
}

type TimelineReceived struct {
	MessageID uuid.UUID `json:"id"`
	UserID uuid.UUID `json:"userId"`
	ChannelID uuid.UUID `json:"channelId"`
	Content string `json:"content"`
	CreatedAt datetime.DateTime `json:"createdAt"`
	UpdatedAt datetime.DateTime `json:"updatedAt"`
}

func GetActivity(sbp, all string) (*[]TimelineReceived, error) {
	result, err := http.NewRequest("GET", "https://q.trap.jp/api/v3/activity/timeline?all=" + all, nil)
	if err != nil {
		return nil, err
	}
	defer result.Body.Close()
	var res []TimelineReceived
	json.NewDecoder(result.Body).Decode(&res)
	return &res, nil
}

func (h *TimelineHandler) GetTimeline(c echo.Context) error {
	params := c.QueryParams()
	if !(params.Has("sortByPopularity")||params.Has("all")) {
		return c.JSON(http.StatusBadRequest, nil)
	}
	if params.Get("sortByPopularity") == "true" {
		// sort
	}
	return nil
}

func (H *TimelineHandler) GetIn(c echo.Context) error {
	return nil
}