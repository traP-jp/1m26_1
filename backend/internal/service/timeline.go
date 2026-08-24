package service

import "github.com/traP-jp/1m26_1/backend/internal/repository"

// takusan

type TimelineService struct {
	timelineRepository repository.TimelineRepository
	events             EventSender
}

func NewTimelineService(timelineRepository repository.TimelineRepository, events EventSender) *TimelineService {
	return &TimelineService{
		timelineRepository: timelineRepository,
		events: events,
	}
}
