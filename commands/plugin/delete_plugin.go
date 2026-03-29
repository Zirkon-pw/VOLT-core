package plugin

import (
	"context"

	commandbase "volt/commands"
	coreplugin "volt/core/plugin"
)

const DeleteName = "plugin.delete"

type DeleteRequest struct {
	PluginID string
}

type DeleteResponse struct{}

type DeleteCommand struct {
	repo coreplugin.Repository
}

func NewDeleteCommand(repo coreplugin.Repository) *DeleteCommand {
	return &DeleteCommand{repo: repo}
}

func (c *DeleteCommand) Name() string {
	return DeleteName
}

func (c *DeleteCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[DeleteRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	if err := c.repo.DeletePlugin(request.PluginID); err != nil {
		return nil, err
	}

	return DeleteResponse{}, nil
}
