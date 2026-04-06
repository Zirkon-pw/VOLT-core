package wailshandler

import (
	appprocess "volt/backend/application/process"
	domain "volt/backend/domain/process"
)

type ProcessHandler struct {
	service *appprocess.Service
}

func NewProcessHandler(service *appprocess.Service) *ProcessHandler {
	return &ProcessHandler{service: service}
}

func (h *ProcessHandler) Start(req domain.StartRequest) error {
	return h.service.Start(req)
}

func (h *ProcessHandler) Cancel(runID string) {
	h.service.Cancel(runID)
}
