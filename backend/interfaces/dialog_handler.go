package wailshandler

import (
	appdialog "volt/backend/application/dialog"
	domain "volt/backend/domain/dialog"
)

type DialogHandler struct {
	service *appdialog.Service
}

func NewDialogHandler(service *appdialog.Service) *DialogHandler {
	return &DialogHandler{service: service}
}

func (h *DialogHandler) SelectDirectory() (string, error) {
	return h.service.SelectDirectory("Select Directory")
}

func (h *DialogHandler) PickFiles(title string, filters []domain.FileFilter, multiple bool) ([]string, error) {
	return h.service.PickFiles(title, filters, multiple)
}

func (h *DialogHandler) PickImage() (string, error) {
	return h.service.PickImage()
}
