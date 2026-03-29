package plugin

import (
	"context"

	commandbase "volt/commands"
	coreplugin "volt/core/plugin"
)

const SetEnabledName = "plugin.setEnabled"

type SetEnabledRequest struct {
	PluginID string
	Enabled  bool
}

type SetEnabledResponse struct{}

type SetEnabledCommand struct {
	repo coreplugin.Repository
}

func NewSetEnabledCommand(repo coreplugin.Repository) *SetEnabledCommand {
	return &SetEnabledCommand{repo: repo}
}

func (c *SetEnabledCommand) Name() string {
	return SetEnabledName
}

func (c *SetEnabledCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[SetEnabledRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	if err := c.repo.SetPluginEnabled(request.PluginID, request.Enabled); err != nil {
		return nil, err
	}

	return SetEnabledResponse{}, nil
}
