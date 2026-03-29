package plugin

import (
	"context"

	commandbase "volt/commands"
	coreplugin "volt/core/plugin"
)

const (
	GetDataName = "plugin.getData"
	SetDataName = "plugin.setData"
)

type GetDataRequest struct {
	PluginID string
	Key      string
}

type GetDataResponse struct {
	Value string
}

type GetDataCommand struct {
	repo coreplugin.Repository
}

func NewGetDataCommand(repo coreplugin.Repository) *GetDataCommand {
	return &GetDataCommand{repo: repo}
}

func (c *GetDataCommand) Name() string {
	return GetDataName
}

func (c *GetDataCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[GetDataRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	value, err := c.repo.GetPluginData(request.PluginID, request.Key)
	if err != nil {
		return nil, err
	}

	return GetDataResponse{Value: value}, nil
}

type SetDataRequest struct {
	PluginID string
	Key      string
	Value    string
}

type SetDataResponse struct{}

type SetDataCommand struct {
	repo coreplugin.Repository
}

func NewSetDataCommand(repo coreplugin.Repository) *SetDataCommand {
	return &SetDataCommand{repo: repo}
}

func (c *SetDataCommand) Name() string {
	return SetDataName
}

func (c *SetDataCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[SetDataRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	if err := c.repo.SetPluginData(request.PluginID, request.Key, request.Value); err != nil {
		return nil, err
	}

	return SetDataResponse{}, nil
}
