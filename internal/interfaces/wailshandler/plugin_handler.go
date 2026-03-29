package wailshandler

import (
	"context"
	"sync"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"

	domain "volt/core/plugin"
	appplugin "volt/internal/application/plugin"
	appsettings "volt/internal/application/settings"
)

type PluginHandler struct {
	ctx            context.Context
	listPlugins    *appplugin.ListPluginsUseCase
	loadPlugin     *appplugin.LoadPluginUseCase
	togglePlugin   *appplugin.TogglePluginUseCase
	importPlugin   *appplugin.ImportPluginUseCase
	deletePlugin   *appplugin.DeletePluginUseCase
	getPluginData  *appplugin.GetPluginDataUseCase
	setPluginData  *appplugin.SetPluginDataUseCase
	localization   *appsettings.LocalizationService
	processMu      sync.Mutex
	processCancels map[string]context.CancelFunc
}

func NewPluginHandler(
	listPlugins *appplugin.ListPluginsUseCase,
	loadPlugin *appplugin.LoadPluginUseCase,
	togglePlugin *appplugin.TogglePluginUseCase,
	importPlugin *appplugin.ImportPluginUseCase,
	deletePlugin *appplugin.DeletePluginUseCase,
	getPluginData *appplugin.GetPluginDataUseCase,
	setPluginData *appplugin.SetPluginDataUseCase,
	localization *appsettings.LocalizationService,
) *PluginHandler {
	return &PluginHandler{
		listPlugins:    listPlugins,
		loadPlugin:     loadPlugin,
		togglePlugin:   togglePlugin,
		importPlugin:   importPlugin,
		deletePlugin:   deletePlugin,
		getPluginData:  getPluginData,
		setPluginData:  setPluginData,
		localization:   localization,
		processMu:      sync.Mutex{},
		processCancels: make(map[string]context.CancelFunc),
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
		return "", localizedPluginError(h.localization, "backend.action.loadPlugin", fmtKeyValue("pluginId", pluginID), err)
	}
	return result, nil
}

func (h *PluginHandler) SetPluginEnabled(pluginID string, enabled bool) error {
	if err := h.togglePlugin.Execute(pluginID, enabled); err != nil {
		return localizedPluginError(h.localization, "backend.action.togglePlugin", fmtKeyValue("pluginId", pluginID), err)
	}
	return nil
}

func (h *PluginHandler) PickPluginArchive() (string, error) {
	selection, err := wailsRuntime.OpenFileDialog(h.ctx, wailsRuntime.OpenDialogOptions{
		Title: translate(h.localization, "dialog.selectPluginArchive", nil),
		Filters: []wailsRuntime.FileFilter{
			{
				DisplayName: translate(h.localization, "dialog.pluginArchivesFilter", nil),
				Pattern:     "*.zip",
			},
		},
	})
	if err != nil {
		return "", localizedUnexpectedError(h.localization, "backend.action.openPluginArchiveDialog", nil, err)
	}

	return selection, nil
}

func (h *PluginHandler) ImportPluginArchive(archivePath string) (domain.Plugin, error) {
	result, err := h.importPlugin.Execute(archivePath)
	if err != nil {
		return domain.Plugin{}, localizedPluginError(h.localization, "backend.action.importPluginArchive", nil, err)
	}

	return result, nil
}

func (h *PluginHandler) DeletePlugin(pluginID string) error {
	if err := h.deletePlugin.Execute(pluginID); err != nil {
		return localizedPluginError(h.localization, "backend.action.deletePlugin", fmtKeyValue("pluginId", pluginID), err)
	}

	return nil
}

func (h *PluginHandler) GetPluginData(pluginID, key string) (string, error) {
	result, err := h.getPluginData.Execute(pluginID, key)
	if err != nil {
		return "", localizedPluginError(h.localization, "backend.action.getPluginData", nil, err)
	}
	return result, nil
}

func (h *PluginHandler) SetPluginData(pluginID, key, value string) error {
	if err := h.setPluginData.Execute(pluginID, key, value); err != nil {
		return localizedPluginError(h.localization, "backend.action.setPluginData", nil, err)
	}
	return nil
}
