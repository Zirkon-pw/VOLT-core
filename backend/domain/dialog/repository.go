package dialog

import "context"

type Repository interface {
	OpenDirectoryDialog(ctx context.Context, title string) (string, error)
	OpenFileDialog(ctx context.Context, title string, filters []FileFilter) (string, error)
	OpenMultipleFilesDialog(ctx context.Context, title string, filters []FileFilter) ([]string, error)
}
