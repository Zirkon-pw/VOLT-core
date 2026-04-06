package wailshandler

import (
	"context"
	"log"

	domainprocess "volt/backend/domain/process"
)

type Lifecycle struct {
	runtime domainprocess.Runtime
}

func NewLifecycle(runtime domainprocess.Runtime) *Lifecycle {
	return &Lifecycle{runtime: runtime}
}

func (l *Lifecycle) Startup(ctx context.Context) {
	l.runtime.SetContext(ctx)
}

func (l *Lifecycle) DomReady(ctx context.Context) {
	log.Println("Volt ready")
}
