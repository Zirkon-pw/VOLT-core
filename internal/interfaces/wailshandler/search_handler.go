package wailshandler

import (
	"context"

	domain "volt/core/search"
	appsearch "volt/internal/application/search"
	appsettings "volt/internal/application/settings"
)

type SearchHandler struct {
	ctx          context.Context
	searchFiles  *appsearch.SearchFilesUseCase
	localization *appsettings.LocalizationService
}

func NewSearchHandler(searchFiles *appsearch.SearchFilesUseCase, localization *appsettings.LocalizationService) *SearchHandler {
	return &SearchHandler{
		searchFiles:  searchFiles,
		localization: localization,
	}
}

func (h *SearchHandler) SetContext(ctx context.Context) {
	h.ctx = ctx
}

func (h *SearchHandler) SearchFiles(voltPath, query string) ([]domain.SearchResult, error) {
	result, err := h.searchFiles.Execute(voltPath, query)
	if err != nil {
		return nil, localizedUnexpectedError(h.localization, "backend.action.searchFiles", nil, err)
	}
	return result, nil
}
