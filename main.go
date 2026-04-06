package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"

	"volt/backend/bootstrap"
	wailshandler "volt/backend/interfaces"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	container := bootstrap.NewContainer()

	err := wails.Run(&options.App{
		Title:     "volt",
		Width:     1280,
		Height:    800,
		MinWidth:  720,
		MinHeight: 560,
		AssetServer: &assetserver.Options{
			Assets:  assets,
			Handler: wailshandler.NewVaultAssetServer(),
		},
		BackgroundColour: &options.RGBA{R: 236, G: 223, B: 210, A: 255},
		StartHidden:      false,
		Frameless:        false,
		OnStartup:        container.Lifecycle.Startup,
		OnDomReady:       container.Lifecycle.DomReady,
		Bind:             container.Bindings(),
		Mac: &mac.Options{
			TitleBar: &mac.TitleBar{
				TitlebarAppearsTransparent: true,
				HideTitle:                  true,
				HideTitleBar:               false,
				FullSizeContent:            true,
				UseToolbar:                 false,
			},
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			About: &mac.AboutInfo{
				Title:   "Volt",
				Message: "Knowledge management for power users",
			},
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
