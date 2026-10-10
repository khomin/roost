package core

import (
	"roost/internal/core/domain"
	"sync"
	"time"
)

type CameraTask struct {
	CameraID  string
	State     domain.CameraState
	Err       error
	StartedAt time.Time
}

type CameraTasks struct {
	mu    sync.RWMutex
	tasks map[string]*CameraTask
}

func NewCameraTasks() *CameraTasks {
	return &CameraTasks{tasks: make(map[string]*CameraTask)}
}

func (t *CameraTasks) Set(id string, state domain.CameraState, err error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.tasks[id] = &CameraTask{
		CameraID:  id,
		State:     state,
		Err:       err,
		StartedAt: time.Now(),
	}
}

func (t *CameraTasks) Get(id string) (*CameraTask, bool) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	task, ok := t.tasks[id]
	return task, ok
}

func (t *CameraTasks) List() []*CameraTask {
	t.mu.RLock()
	defer t.mu.RUnlock()
	out := make([]*CameraTask, 0, len(t.tasks))
	for _, t := range t.tasks {
		out = append(out, t)
	}
	return out
}
