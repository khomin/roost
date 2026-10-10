package core

import (
	"sync"
	"time"

	"github.com/pion/webrtc/v4"
	"github.com/pion/webrtc/v4/pkg/media"
)

type StreamHub struct {
	mu     sync.RWMutex
	tracks map[string]*webrtc.TrackLocalStaticSample
}

func NewStreamHub() *StreamHub {
	return &StreamHub{
		tracks: make(map[string]*webrtc.TrackLocalStaticSample),
	}
}

func (h *StreamHub) AddViewer(id string, track *webrtc.TrackLocalStaticSample) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.tracks[id] = track
}

func (h *StreamHub) RemoveViewer(id string, track *webrtc.TrackLocalStaticSample) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.tracks, id)
}

func (h *StreamHub) BroadcastFrame(frame []byte, duration time.Duration) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for _, track := range h.tracks {
		_ = track.WriteSample(media.Sample{
			Data:     frame,
			Duration: duration,
		})
	}
}
