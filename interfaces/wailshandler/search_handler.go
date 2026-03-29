package wailshandler

import (
	"context"

	commandbase "volt/commands"
	commandsearch "volt/commands/search"
	domain "volt/core/search"
	coresettings "volt/core/settings"
)

type SearchHandler struct {
	manager      *commandbase.Manager
	localization *coresettings.LocalizationService
}

func NewSearchHandler(manager *commandbase.Manager, localization *coresettings.LocalizationService) *SearchHandler {
	return &SearchHandler{
		manager:      manager,
		localization: localization,
	}
}

func (h *SearchHandler) SearchFiles(voltPath, query string) ([]domain.SearchResult, error) {
	result, err := commandbase.Execute[commandsearch.SearchFilesResponse](
		context.Background(),
		h.manager,
		commandsearch.SearchFilesName,
		commandsearch.SearchFilesRequest{VoltPath: voltPath, Query: query},
	)
	if err != nil {
		return nil, localizedUnexpectedError(h.localization, "backend.action.searchFiles", nil, err)
	}
	return result.Results, nil
}
