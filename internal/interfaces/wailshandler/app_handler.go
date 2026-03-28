package wailshandler

import (
	"context"
	"log"
)

type AppHandler struct {
	ctx           context.Context
	voltHandler   *VoltHandler
	noteHandler   *NoteHandler
	searchHandler *SearchHandler
	pluginHandler *PluginHandler
	imageHandler  *ImageHandler
}

func NewAppHandler(voltHandler *VoltHandler, noteHandler *NoteHandler, searchHandler *SearchHandler, pluginHandler *PluginHandler, imageHandler *ImageHandler) *AppHandler {
	return &AppHandler{
		voltHandler:   voltHandler,
		noteHandler:   noteHandler,
		searchHandler: searchHandler,
		pluginHandler: pluginHandler,
		imageHandler:  imageHandler,
	}
}

func (h *AppHandler) DomReady(ctx context.Context) {
	log.Println("Volt ready")
}

func (h *AppHandler) Startup(ctx context.Context) {
	h.ctx = ctx
	h.voltHandler.SetContext(ctx)
	h.noteHandler.SetContext(ctx)
	h.searchHandler.SetContext(ctx)
	h.pluginHandler.SetContext(ctx)
	h.imageHandler.SetContext(ctx)
}
