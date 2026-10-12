package core

import (
	"log/slog"
	"sync"
	"time"

	"github.com/pion/webrtc/v4"
	"github.com/pion/webrtc/v4/pkg/media"
)

type StreamHub struct {
	mu     sync.RWMutex
	tracks map[string]*webrtc.TrackLocalStaticSample
	log    *slog.Logger
}

func NewStreamHub() *StreamHub {
	return &StreamHub{
		tracks: make(map[string]*webrtc.TrackLocalStaticSample),
		log:    slog.With("component", "StreamHub"),
	}
}

func (h *StreamHub) AddViewer(cameraID string, track *webrtc.TrackLocalStaticSample) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.tracks[cameraID] = track
}

func (h *StreamHub) RemoveViewer(cameraID string, track *webrtc.TrackLocalStaticSample) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.tracks, cameraID)
}

func (h *StreamHub) BroadcastFrame(cameraID string, frame []byte, duration time.Duration) {
	h.mu.Lock()
	defer h.mu.Unlock()

	track, ok := h.tracks[cameraID]
	if ok {
		err := track.WriteSample(media.Sample{
			Data:     frame,
			Duration: duration,
		})
		if err != nil {
			h.log.Error("failed to write sample", "err", err)
		}
	}
}
