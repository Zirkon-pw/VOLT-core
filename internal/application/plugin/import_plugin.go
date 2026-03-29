package plugin

import (
	domain "volt/core/plugin"
	"volt/internal/infrastructure/filesystem"
)

type ImportPluginUseCase struct {
	store *filesystem.PluginStore
}

func NewImportPluginUseCase(store *filesystem.PluginStore) *ImportPluginUseCase {
	return &ImportPluginUseCase{store: store}
}

func (uc *ImportPluginUseCase) Execute(archivePath string) (domain.Plugin, error) {
	return uc.store.ImportPluginArchive(archivePath)
}
