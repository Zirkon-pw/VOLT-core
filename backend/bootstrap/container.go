package bootstrap

import (
	"log"

	appfile "volt/backend/application/file"
	appdialog "volt/backend/application/dialog"
	appprocess "volt/backend/application/process"
	appstorage "volt/backend/application/storage"
	infrafilesystem "volt/backend/infrastructure/filesystem"
	infradialog "volt/backend/infrastructure/dialog"
	infrastorage "volt/backend/infrastructure/storage"
	infrawails "volt/backend/infrastructure/wails"
	wailshandler "volt/backend/interfaces"
)

type Container struct {
	Lifecycle      *wailshandler.Lifecycle
	fileHandler    *wailshandler.FileHandler
	processHandler *wailshandler.ProcessHandler
	dialogHandler  *wailshandler.DialogHandler
	storageHandler *wailshandler.StorageHandler
}

func NewContainer() *Container {
	// Infrastructure
	runtime := infrawails.NewRuntime()
	fileRepo := infrafilesystem.NewFileRepository()
	dialogRepo := infradialog.NewWailsDialogRepository()

	kvRepo, err := infrastorage.NewJSONKVRepository()
	if err != nil {
		log.Fatalf("failed to initialize KV repository: %v", err)
	}

	// Application services
	fileService := appfile.NewService(fileRepo)
	processService := appprocess.NewService(runtime)
	dialogService := appdialog.NewService(dialogRepo, runtime)
	storageService := appstorage.NewService(kvRepo)

	// Interfaces (handlers)
	lifecycle := wailshandler.NewLifecycle(runtime)
	fileHandler := wailshandler.NewFileHandler(fileService)
	processHandler := wailshandler.NewProcessHandler(processService)
	dialogHandler := wailshandler.NewDialogHandler(dialogService)
	storageHandler := wailshandler.NewStorageHandler(storageService)

	return &Container{
		Lifecycle:      lifecycle,
		fileHandler:    fileHandler,
		processHandler: processHandler,
		dialogHandler:  dialogHandler,
		storageHandler: storageHandler,
	}
}

func (c *Container) Bindings() []interface{} {
	return []interface{}{
		c.fileHandler,
		c.processHandler,
		c.dialogHandler,
		c.storageHandler,
	}
}
