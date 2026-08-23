package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type TimelineHandler struct{}

func NewTimelineHandler() *TimelineHandler {
	return &TimelineHandler{}
}

func GetActivity(sbp, all string) error {
	result, err := http.NewRequest("GET", "https://q.trap.jp/api/v3/activity/timeline?all="+all, nil)
	if err != nil {
		return err
	}
	defer result.Body.Close()
	return nil
}

func (h *TimelineHandler) GetTimeline(c echo.Context) error {
	params := c.QueryParams()
	if !(params.Has("sortByPopularity") || params.Has("all")) {
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
