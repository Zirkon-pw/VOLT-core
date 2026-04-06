package process

import "context"

// EventEmitter sends process events to the frontend.
type EventEmitter interface {
	EmitProcessEvent(ctx context.Context, event RuntimeEvent)
}

// Runtime provides access to the application context and logging.
type Runtime interface {
	Context() context.Context
	SetContext(ctx context.Context)
	EventsEmit(ctx context.Context, name string, payload any)
	LogError(ctx context.Context, message string)
}
