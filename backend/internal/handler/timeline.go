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
	lastUpdate    time.Time
	bottomMessage time.Time
}

func NewTimelineHandler() *TimelineHandler {
	return &TimelineHandler{
		lastUpdate:    time.Now(),
		bottomMessage: time.Now(),
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

type TimelineResponse struct {
	Messages []uuid.UUID `json:"messages"`
}

type StampsReceived struct {
	StampID uuid.UUID `json:"stampId"`
	UserID  uuid.UUID `json:"userId"`
	Count   Count     `json:"count"`
}

func GetActivity(sbp, all, query string) (*[]TimelineDetailed, *time.Time, *time.Time, error) {
	result, err := http.NewRequest("GET", "https://q.trap.jp/api/v3/messages?bot=false&limit=100&"+query, nil)
	if err != nil {
		return nil, nil, nil, err
	}
	defer result.Body.Close()
	var res MessagesResponse
	json.NewDecoder(result.Body).Decode(&res)
	res4 := res.Content
	res_d := make([]TimelineDetailed, len(res4))
	for i, v := range res4 {
		tmp, err2 := http.NewRequest("GET", "https://q.trap.jp/api/v3/messages/"+v.MessageID.String()+"/stamps", nil)
		if err2 != nil {
			return nil, nil, nil, err2
		}
		defer tmp.Body.Close()
		var res2 []StampsReceived
		json.NewDecoder(result.Body).Decode(&res2)
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
	return &res_d, &u, &res_d[len(res_d)-1].CreatedAt, nil
}

func (h *TimelineHandler) GetTimeline(c echo.Context) error {
	params := c.QueryParams()
	if !(params.Has("sortByPopularity")) {
		return c.JSON(http.StatusBadRequest, nil)
	}
	res, _, bm, err := GetActivity(params.Get("sortByPopularity"), "true", "before="+h.bottomMessage.String())
	h.bottomMessage = *bm
	if err != nil {
		return c.JSON(http.StatusBadRequest, nil)
	}
	return c.JSON(http.StatusOK, *res)
}

func (h *TimelineHandler) GetIn(c echo.Context) error {
	params := c.QueryParams()
	if !(params.Has("sortByPopularity")) {
		return c.JSON(http.StatusBadRequest, nil)
	}
	res, lu, _, err := GetActivity(params.Get("sortByPopularity"), "true", "after="+h.lastUpdate.String())
	h.lastUpdate = *lu
	if err != nil {
		return c.JSON(http.StatusBadRequest, nil)
	}
	return c.JSON(http.StatusOK, *res)
}
