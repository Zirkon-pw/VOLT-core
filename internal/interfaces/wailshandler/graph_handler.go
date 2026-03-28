package wailshandler

import (
	"context"

	domain "volt/core/graph"
	appgraph "volt/internal/application/graph"
	appsettings "volt/internal/application/settings"
)

type GraphHandler struct {
	ctx          context.Context
	buildGraph   *appgraph.BuildGraphUseCase
	localization *appsettings.LocalizationService
}

func NewGraphHandler(buildGraph *appgraph.BuildGraphUseCase, localization *appsettings.LocalizationService) *GraphHandler {
	return &GraphHandler{
		buildGraph:   buildGraph,
		localization: localization,
	}
}

func (h *GraphHandler) SetContext(ctx context.Context) {
	h.ctx = ctx
}

func (h *GraphHandler) GetGraph(voltPath string) (*domain.Graph, error) {
	result, err := h.buildGraph.Execute(voltPath)
	if err != nil {
		return nil, localizedUnexpectedError(h.localization, "backend.action.buildGraph", nil, err)
	}
	return result, nil
}
