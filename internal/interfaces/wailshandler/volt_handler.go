package wailshandler

import (
	"context"

	domain "volt/core/volt"
	appsettings "volt/internal/application/settings"
	appvolt "volt/internal/application/volt"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type VoltHandler struct {
	ctx          context.Context
	listVolts    *appvolt.ListVoltsUseCase
	createVolt   *appvolt.CreateVoltUseCase
	deleteVolt   *appvolt.DeleteVoltUseCase
	localization *appsettings.LocalizationService
}

func NewVoltHandler(
	listVolts *appvolt.ListVoltsUseCase,
	createVolt *appvolt.CreateVoltUseCase,
	deleteVolt *appvolt.DeleteVoltUseCase,
	localization *appsettings.LocalizationService,
) *VoltHandler {
	return &VoltHandler{
		listVolts:    listVolts,
		createVolt:   createVolt,
		deleteVolt:   deleteVolt,
		localization: localization,
	}
}

func (h *VoltHandler) SetContext(ctx context.Context) {
	h.ctx = ctx
}

func (h *VoltHandler) ListVolts() ([]domain.Volt, error) {
	result, err := h.listVolts.Execute()
	if err != nil {
		return nil, localizedVoltError(h.localization, "backend.action.listVolts", nil, err)
	}
	return result, nil
}

func (h *VoltHandler) CreateVolt(name, path string) (*domain.Volt, error) {
	result, err := h.createVolt.Execute(name, path)
	if err != nil {
		return nil, localizedVoltError(h.localization, "backend.action.createVolt", fmtKeyValue("name", name), err)
	}
	return result, nil
}

func (h *VoltHandler) DeleteVolt(id string) error {
	if err := h.deleteVolt.Execute(id); err != nil {
		return localizedVoltError(h.localization, "backend.action.deleteVolt", nil, err)
	}
	return nil
}

func (h *VoltHandler) SelectDirectory() (string, error) {
	result, err := wailsRuntime.OpenDirectoryDialog(h.ctx, wailsRuntime.OpenDialogOptions{
		Title: translate(h.localization, "dialog.selectVoltDirectory", nil),
	})
	if err != nil {
		return "", localizedUnexpectedError(h.localization, "backend.action.openDirectoryDialog", nil, err)
	}
	return result, nil
}
