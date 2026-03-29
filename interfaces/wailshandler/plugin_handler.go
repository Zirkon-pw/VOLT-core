package wailshandler

import (
	"context"

	commandbase "volt/commands"
	commandplugin "volt/commands/plugin"
	commandssystem "volt/commands/system"
	domain "volt/core/plugin"
	coresettings "volt/core/settings"
)

type PluginHandler struct {
	manager      *commandbase.Manager
	localization *coresettings.LocalizationService
}

func NewPluginHandler(
	manager *commandbase.Manager,
	localization *coresettings.LocalizationService,
) *PluginHandler {
	return &PluginHandler{
		manager:      manager,
		localization: localization,
	}
}

func (h *PluginHandler) ListPlugins() ([]domain.Plugin, error) {
	result, err := commandbase.Execute[commandplugin.ListResponse](
		context.Background(),
		h.manager,
		commandplugin.ListName,
		commandplugin.ListRequest{},
	)
	if err != nil {
		return nil, localizedUnexpectedError(h.localization, "backend.action.listPlugins", nil, err)
	}
	return result.Plugins, nil
}

func (h *PluginHandler) LoadPluginSource(pluginID string) (string, error) {
	result, err := commandbase.Execute[commandplugin.LoadSourceResponse](
		context.Background(),
		h.manager,
		commandplugin.LoadSourceName,
		commandplugin.LoadSourceRequest{PluginID: pluginID},
	)
	if err != nil {
		return "", localizedPluginError(h.localization, "backend.action.loadPlugin", fmtKeyValue("pluginId", pluginID), err)
	}
	return result.Source, nil
}

func (h *PluginHandler) SetPluginEnabled(pluginID string, enabled bool) error {
	_, err := commandbase.Execute[commandplugin.SetEnabledResponse](
		context.Background(),
		h.manager,
		commandplugin.SetEnabledName,
		commandplugin.SetEnabledRequest{PluginID: pluginID, Enabled: enabled},
	)
	if err != nil {
		return localizedPluginError(h.localization, "backend.action.togglePlugin", fmtKeyValue("pluginId", pluginID), err)
	}
	return nil
}

func (h *PluginHandler) PickPluginArchive() (string, error) {
	selection, err := commandbase.Execute[commandssystem.PickFileResponse](
		context.Background(),
		h.manager,
		commandssystem.PickPluginArchiveName,
		commandssystem.PickFileRequest{
			Title: translate(h.localization, "dialog.selectPluginArchive", nil),
			Filters: []commandssystem.FileFilter{
				{
					DisplayName: translate(h.localization, "dialog.pluginArchivesFilter", nil),
					Pattern:     "*.zip",
				},
			},
		},
	)
	if err != nil {
		return "", localizedUnexpectedError(h.localization, "backend.action.openPluginArchiveDialog", nil, err)
	}

	return selection.Path, nil
}

func (h *PluginHandler) ImportPluginArchive(archivePath string) (domain.Plugin, error) {
	result, err := commandbase.Execute[commandplugin.ImportArchiveResponse](
		context.Background(),
		h.manager,
		commandplugin.ImportArchiveName,
		commandplugin.ImportArchiveRequest{ArchivePath: archivePath},
	)
	if err != nil {
		return domain.Plugin{}, localizedPluginError(h.localization, "backend.action.importPluginArchive", nil, err)
	}

	return result.Plugin, nil
}

func (h *PluginHandler) DeletePlugin(pluginID string) error {
	_, err := commandbase.Execute[commandplugin.DeleteResponse](
		context.Background(),
		h.manager,
		commandplugin.DeleteName,
		commandplugin.DeleteRequest{PluginID: pluginID},
	)
	if err != nil {
		return localizedPluginError(h.localization, "backend.action.deletePlugin", fmtKeyValue("pluginId", pluginID), err)
	}

	return nil
}

func (h *PluginHandler) GetPluginData(pluginID, key string) (string, error) {
	result, err := commandbase.Execute[commandplugin.GetDataResponse](
		context.Background(),
		h.manager,
		commandplugin.GetDataName,
		commandplugin.GetDataRequest{PluginID: pluginID, Key: key},
	)
	if err != nil {
		return "", localizedPluginError(h.localization, "backend.action.getPluginData", nil, err)
	}
	return result.Value, nil
}

func (h *PluginHandler) SetPluginData(pluginID, key, value string) error {
	_, err := commandbase.Execute[commandplugin.SetDataResponse](
		context.Background(),
		h.manager,
		commandplugin.SetDataName,
		commandplugin.SetDataRequest{PluginID: pluginID, Key: key, Value: value},
	)
	if err != nil {
		return localizedPluginError(h.localization, "backend.action.setPluginData", nil, err)
	}
	return nil
}
