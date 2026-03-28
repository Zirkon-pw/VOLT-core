package wailshandler

import (
	"context"

	domain "volt/core/plugin"
	appplugin "volt/internal/application/plugin"
	appsettings "volt/internal/application/settings"
)

type PluginHandler struct {
	ctx           context.Context
	listPlugins   *appplugin.ListPluginsUseCase
	loadPlugin    *appplugin.LoadPluginUseCase
	togglePlugin  *appplugin.TogglePluginUseCase
	getPluginData *appplugin.GetPluginDataUseCase
	setPluginData *appplugin.SetPluginDataUseCase
	localization  *appsettings.LocalizationService
}

func NewPluginHandler(
	listPlugins *appplugin.ListPluginsUseCase,
	loadPlugin *appplugin.LoadPluginUseCase,
	togglePlugin *appplugin.TogglePluginUseCase,
	getPluginData *appplugin.GetPluginDataUseCase,
	setPluginData *appplugin.SetPluginDataUseCase,
	localization *appsettings.LocalizationService,
) *PluginHandler {
	return &PluginHandler{
		listPlugins:   listPlugins,
		loadPlugin:    loadPlugin,
		togglePlugin:  togglePlugin,
		getPluginData: getPluginData,
		setPluginData: setPluginData,
		localization:  localization,
	}
}

func (h *PluginHandler) SetContext(ctx context.Context) {
	h.ctx = ctx
}

func (h *PluginHandler) ListPlugins() ([]domain.Plugin, error) {
	result, err := h.listPlugins.Execute()
	if err != nil {
		return nil, localizedUnexpectedError(h.localization, "backend.action.listPlugins", nil, err)
	}
	return result, nil
}

func (h *PluginHandler) LoadPluginSource(pluginID string) (string, error) {
	result, err := h.loadPlugin.Execute(pluginID)
	if err != nil {
		return "", localizedUnexpectedError(h.localization, "backend.action.loadPlugin", fmtKeyValue("pluginId", pluginID), err)
	}
	return result, nil
}

func (h *PluginHandler) SetPluginEnabled(pluginID string, enabled bool) error {
	if err := h.togglePlugin.Execute(pluginID, enabled); err != nil {
		return localizedUnexpectedError(h.localization, "backend.action.togglePlugin", fmtKeyValue("pluginId", pluginID), err)
	}
	return nil
}

func (h *PluginHandler) GetPluginData(pluginID, key string) (string, error) {
	result, err := h.getPluginData.Execute(pluginID, key)
	if err != nil {
		return "", localizedUnexpectedError(h.localization, "backend.action.getPluginData", nil, err)
	}
	return result, nil
}

func (h *PluginHandler) SetPluginData(pluginID, key, value string) error {
	if err := h.setPluginData.Execute(pluginID, key, value); err != nil {
		return localizedUnexpectedError(h.localization, "backend.action.setPluginData", nil, err)
	}
	return nil
}
