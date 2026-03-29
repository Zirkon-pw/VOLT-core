package bootstrap

import (
	"log"
	"path/filepath"

	appnote "volt/internal/application/note"
	appplugin "volt/internal/application/plugin"
	appsearch "volt/internal/application/search"
	appsettings "volt/internal/application/settings"
	appvolt "volt/internal/application/volt"
	"volt/internal/infrastructure/filesystem"
	"volt/internal/infrastructure/persistence/local"
	"volt/internal/interfaces/wailshandler"
)

type Container struct {
	App             *wailshandler.AppHandler
	voltHandler     *wailshandler.VoltHandler
	noteHandler     *wailshandler.NoteHandler
	searchHandler   *wailshandler.SearchHandler
	pluginHandler   *wailshandler.PluginHandler
	imageHandler    *wailshandler.ImageHandler
	settingsHandler *wailshandler.SettingsHandler
}

func NewContainer() *Container {
	// Persistence
	voltStore, err := local.NewVoltStore()
	if err != nil {
		log.Fatalf("failed to initialize volt store: %v", err)
	}

	settingsStore, err := local.NewAppSettingsStore()
	if err != nil {
		log.Fatalf("failed to initialize settings store: %v", err)
	}

	localization, err := appsettings.NewLocalizationService(settingsStore, filepath.Join(settingsStore.ConfigDir(), "locales"))
	if err != nil {
		log.Fatalf("failed to initialize localization service: %v", err)
	}

	noteRepo := filesystem.NewNoteRepository()

	// Use cases — volt
	listVolts := appvolt.NewListVoltsUseCase(voltStore)
	createVolt := appvolt.NewCreateVoltUseCase(voltStore)
	deleteVolt := appvolt.NewDeleteVoltUseCase(voltStore)

	// Use cases — note
	readNote := appnote.NewReadNoteUseCase(noteRepo)
	saveNote := appnote.NewSaveNoteUseCase(noteRepo)
	listTree := appnote.NewListTreeUseCase(noteRepo)
	createNote := appnote.NewCreateNoteUseCase(noteRepo)
	createFile := appnote.NewCreateFileUseCase(noteRepo)
	createDir := appnote.NewCreateDirectoryUseCase(noteRepo)
	deleteNote := appnote.NewDeleteNoteUseCase(noteRepo)
	renameNote := appnote.NewRenameNoteUseCase(noteRepo)

	// Use cases — search
	searchFiles := appsearch.NewSearchFilesUseCase()

	// Plugin store
	pluginStore, err := filesystem.NewPluginStore()
	if err != nil {
		log.Fatalf("failed to initialize plugin store: %v", err)
	}

	// Use cases — plugin
	listPlugins := appplugin.NewListPluginsUseCase(pluginStore)
	loadPlugin := appplugin.NewLoadPluginUseCase(pluginStore)
	togglePlugin := appplugin.NewTogglePluginUseCase(pluginStore)
	importPlugin := appplugin.NewImportPluginUseCase(pluginStore)
	deletePlugin := appplugin.NewDeletePluginUseCase(pluginStore)
	getPluginData := appplugin.NewGetPluginDataUseCase(pluginStore)
	setPluginData := appplugin.NewSetPluginDataUseCase(pluginStore)

	// Handlers
	voltHandler := wailshandler.NewVoltHandler(listVolts, createVolt, deleteVolt, localization)
	noteHandler := wailshandler.NewNoteHandler(readNote, saveNote, listTree, createNote, createFile, createDir, deleteNote, renameNote, localization)
	searchHandler := wailshandler.NewSearchHandler(searchFiles, localization)
	pluginHandler := wailshandler.NewPluginHandler(
		listPlugins,
		loadPlugin,
		togglePlugin,
		importPlugin,
		deletePlugin,
		getPluginData,
		setPluginData,
		localization,
	)
	imageHandler := wailshandler.NewImageHandler(localization)
	settingsHandler := wailshandler.NewSettingsHandler(localization)
	appHandler := wailshandler.NewAppHandler(voltHandler, noteHandler, searchHandler, pluginHandler, imageHandler)

	return &Container{
		App:             appHandler,
		voltHandler:     voltHandler,
		noteHandler:     noteHandler,
		searchHandler:   searchHandler,
		pluginHandler:   pluginHandler,
		imageHandler:    imageHandler,
		settingsHandler: settingsHandler,
	}
}

func (c *Container) Bindings() []interface{} {
	return []interface{}{
		c.App,
		c.voltHandler,
		c.noteHandler,
		c.searchHandler,
		c.pluginHandler,
		c.imageHandler,
		c.settingsHandler,
	}
}
