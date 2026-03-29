package plugin

import (
	"context"

	commandbase "volt/commands"
	domain "volt/core/plugin"
)

const ImportArchiveName = "plugin.importArchive"

type ImportArchiveRequest struct {
	ArchivePath string
}

type ImportArchiveResponse struct {
	Plugin domain.Plugin
}

type ImportArchiveCommand struct {
	repo domain.Repository
}

func NewImportArchiveCommand(repo domain.Repository) *ImportArchiveCommand {
	return &ImportArchiveCommand{repo: repo}
}

func (c *ImportArchiveCommand) Name() string {
	return ImportArchiveName
}

func (c *ImportArchiveCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[ImportArchiveRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	plugin, err := c.repo.ImportPluginArchive(request.ArchivePath)
	if err != nil {
		return nil, err
	}

	return ImportArchiveResponse{Plugin: plugin}, nil
}
