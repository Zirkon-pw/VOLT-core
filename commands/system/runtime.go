package system

import "context"

type FileFilter struct {
	DisplayName string
	Pattern     string
}

type Runtime interface {
	Context() context.Context
	SetContext(ctx context.Context)
	OpenDirectoryDialog(ctx context.Context, title string) (string, error)
	OpenFileDialog(ctx context.Context, title string, filters []FileFilter) (string, error)
	OpenMultipleFilesDialog(ctx context.Context, title string, filters []FileFilter) ([]string, error)
	EventsEmit(ctx context.Context, name string, payload any)
	LogError(ctx context.Context, message string)
}
