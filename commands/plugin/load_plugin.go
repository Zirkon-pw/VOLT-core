package plugin

import (
	"context"

	commandbase "volt/commands"
	coreplugin "volt/core/plugin"
)

const LoadSourceName = "plugin.loadSource"

type LoadSourceRequest struct {
	PluginID string
}

type LoadSourceResponse struct {
	Source string
}

type LoadSourceCommand struct {
	repo coreplugin.Repository
}

func NewLoadSourceCommand(repo coreplugin.Repository) *LoadSourceCommand {
	return &LoadSourceCommand{repo: repo}
}

func (c *LoadSourceCommand) Name() string {
	return LoadSourceName
}

func (c *LoadSourceCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[LoadSourceRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	source, err := c.repo.LoadPluginSource(request.PluginID)
	if err != nil {
		return nil, err
	}

	return LoadSourceResponse{Source: source}, nil
}
