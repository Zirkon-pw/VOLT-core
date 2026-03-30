package wails

import (
	"context"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	commandsystem "volt/commands/system"
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

func (r *Runtime) OpenDirectoryDialog(ctx context.Context, title string) (string, error) {
	return runtime.OpenDirectoryDialog(ctx, runtime.OpenDialogOptions{
		Title: title,
	})
}

func (r *Runtime) OpenFileDialog(ctx context.Context, title string, filters []commandsystem.FileFilter) (string, error) {
	dialogFilters := make([]runtime.FileFilter, 0, len(filters))
	for _, filter := range filters {
		dialogFilters = append(dialogFilters, runtime.FileFilter{
			DisplayName: filter.DisplayName,
			Pattern:     filter.Pattern,
		})
	}

	return runtime.OpenFileDialog(ctx, runtime.OpenDialogOptions{
		Title:   title,
		Filters: dialogFilters,
	})
}

func (r *Runtime) EventsEmit(ctx context.Context, name string, payload any) {
	runtime.EventsEmit(ctx, name, payload)
}

func (r *Runtime) LogError(ctx context.Context, message string) {
	runtime.LogError(ctx, message)
}
