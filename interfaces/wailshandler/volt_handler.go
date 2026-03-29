package wailshandler

import (
	"context"

	commandbase "volt/commands"
	commandssystem "volt/commands/system"
	commandvolt "volt/commands/volt"
	coresettings "volt/core/settings"
	domain "volt/core/volt"
)

type VoltHandler struct {
	manager      *commandbase.Manager
	localization *coresettings.LocalizationService
}

func NewVoltHandler(
	manager *commandbase.Manager,
	localization *coresettings.LocalizationService,
) *VoltHandler {
	return &VoltHandler{
		manager:      manager,
		localization: localization,
	}
}

func (h *VoltHandler) ListVolts() ([]domain.Volt, error) {
	result, err := commandbase.Execute[commandvolt.ListResponse](
		context.Background(),
		h.manager,
		commandvolt.ListName,
		commandvolt.ListRequest{},
	)
	if err != nil {
		return nil, localizedVoltError(h.localization, "backend.action.listVolts", nil, err)
	}
	return result.Volts, nil
}

func (h *VoltHandler) CreateVolt(name, path string) (*domain.Volt, error) {
	result, err := commandbase.Execute[commandvolt.CreateResponse](
		context.Background(),
		h.manager,
		commandvolt.CreateName,
		commandvolt.CreateRequest{Name: name, Path: path},
	)
	if err != nil {
		return nil, localizedVoltError(h.localization, "backend.action.createVolt", fmtKeyValue("name", name), err)
	}
	return result.Volt, nil
}

func (h *VoltHandler) DeleteVolt(id string) error {
	_, err := commandbase.Execute[commandvolt.DeleteResponse](
		context.Background(),
		h.manager,
		commandvolt.DeleteName,
		commandvolt.DeleteRequest{ID: id},
	)
	if err != nil {
		return localizedVoltError(h.localization, "backend.action.deleteVolt", nil, err)
	}
	return nil
}

func (h *VoltHandler) SelectDirectory() (string, error) {
	result, err := commandbase.Execute[commandssystem.SelectDirectoryResponse](
		context.Background(),
		h.manager,
		commandssystem.SelectDirectoryName,
		commandssystem.SelectDirectoryRequest{
			Title: translate(h.localization, "dialog.selectVoltDirectory", nil),
		},
	)
	if err != nil {
		return "", localizedUnexpectedError(h.localization, "backend.action.openDirectoryDialog", nil, err)
	}
	return result.Path, nil
}
