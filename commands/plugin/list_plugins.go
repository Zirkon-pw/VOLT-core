package plugin

import (
	"context"

	commandbase "volt/commands"
	domain "volt/core/plugin"
)

const ListName = "plugin.list"

type ListRequest struct{}

type ListResponse struct {
	Plugins []domain.Plugin
}

type ListCommand struct {
	repo domain.Repository
}

func NewListCommand(repo domain.Repository) *ListCommand {
	return &ListCommand{repo: repo}
}

func (c *ListCommand) Name() string {
	return ListName
}

func (c *ListCommand) Execute(ctx context.Context, req any) (any, error) {
	if _, err := commandbase.Decode[ListRequest](c.Name(), req); err != nil {
		return nil, err
	}

	plugins, err := c.repo.ListPlugins()
	if err != nil {
		return nil, err
	}

	return ListResponse{Plugins: plugins}, nil
}
