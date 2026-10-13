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
	tracks map[string]map[*webrtc.TrackLocalStaticSample]struct{}
	log    *slog.Logger
}

func NewStreamHub() *StreamHub {
	return &StreamHub{
		tracks: make(map[string]map[*webrtc.TrackLocalStaticSample]struct{}),
		log:    slog.With("component", "StreamHub"),
	}
}

func (h *StreamHub) AddViewer(cameraID string, track *webrtc.TrackLocalStaticSample) {
	h.mu.Lock()
	defer h.mu.Unlock()
	viewers, ok := h.tracks[cameraID]
	if !ok {
		viewers = make(map[*webrtc.TrackLocalStaticSample]struct{})
		h.tracks[cameraID] = viewers
	}
	viewers[track] = struct{}{}
}

func (h *StreamHub) RemoveViewer(cameraID string, track *webrtc.TrackLocalStaticSample) {
	h.mu.Lock()
	defer h.mu.Unlock()
	viewers := h.tracks[cameraID]
	delete(viewers, track)
	if len(viewers) == 0 {
		delete(h.tracks, cameraID)
	}
}

func (h *StreamHub) ViewerCount(cameraID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.tracks[cameraID])
}

func (h *StreamHub) BroadcastFrame(cameraID string, frame []byte, duration time.Duration) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for track := range h.tracks[cameraID] {
		err := track.WriteSample(media.Sample{
			Data:     frame,
			Duration: duration,
		})
		if err != nil {
			h.log.Error("failed to write sample", "err", err)
		}
	}
}
