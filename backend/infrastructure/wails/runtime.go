package wails

import (
	"context"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type Runtime struct {
	mu  sync.RWMutex
	ctx context.Context
}

func NewRuntime() *Runtime {
	return &Runtime{}
}

func (r *Runtime) Context() context.Context {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.ctx
}

func (r *Runtime) SetContext(ctx context.Context) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.ctx = ctx
}

func (r *Runtime) EventsEmit(ctx context.Context, name string, payload any) {
	runtime.EventsEmit(ctx, name, payload)
}

func (r *Runtime) LogError(ctx context.Context, message string) {
	runtime.LogError(ctx, message)
}
