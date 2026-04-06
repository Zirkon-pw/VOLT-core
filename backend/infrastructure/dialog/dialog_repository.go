package dialog

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	domain "volt/backend/domain/dialog"
)

type WailsDialogRepository struct{}

func NewWailsDialogRepository() *WailsDialogRepository {
	return &WailsDialogRepository{}
}

func (r *WailsDialogRepository) OpenDirectoryDialog(ctx context.Context, title string) (string, error) {
	return runtime.OpenDirectoryDialog(ctx, runtime.OpenDialogOptions{
		Title: title,
	})
}

func (r *WailsDialogRepository) OpenFileDialog(ctx context.Context, title string, filters []domain.FileFilter) (string, error) {
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

func (r *WailsDialogRepository) OpenMultipleFilesDialog(ctx context.Context, title string, filters []domain.FileFilter) ([]string, error) {
	dialogFilters := make([]runtime.FileFilter, 0, len(filters))
	for _, filter := range filters {
		dialogFilters = append(dialogFilters, runtime.FileFilter{
			DisplayName: filter.DisplayName,
			Pattern:     filter.Pattern,
		})
	}

	return runtime.OpenMultipleFilesDialog(ctx, runtime.OpenDialogOptions{
		Title:   title,
		Filters: dialogFilters,
	})
}
