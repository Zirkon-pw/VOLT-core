package plugin

import "volt/internal/infrastructure/filesystem"

type DeletePluginUseCase struct {
	store *filesystem.PluginStore
}

func NewDeletePluginUseCase(store *filesystem.PluginStore) *DeletePluginUseCase {
	return &DeletePluginUseCase{store: store}
}

func (uc *DeletePluginUseCase) Execute(pluginID string) error {
	return uc.store.DeletePlugin(pluginID)
}
