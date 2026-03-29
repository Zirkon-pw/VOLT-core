package system

import (
	"context"

	commandbase "volt/commands"
)

const (
	SelectDirectoryName   = "system.dialog.selectDirectory"
	PickPluginArchiveName = "system.dialog.pickPluginArchive"
	PickImageName         = "system.dialog.pickImage"
)

type SelectDirectoryRequest struct {
	Title string
}

type SelectDirectoryResponse struct {
	Path string
}

type PickFileRequest struct {
	Title   string
	Filters []FileFilter
}

type PickFileResponse struct {
	Path string
}

type SelectDirectoryCommand struct {
	runtime Runtime
}

func NewSelectDirectoryCommand(runtime Runtime) *SelectDirectoryCommand {
	return &SelectDirectoryCommand{runtime: runtime}
}

func (c *SelectDirectoryCommand) Name() string {
	return SelectDirectoryName
}

func (c *SelectDirectoryCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[SelectDirectoryRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	runtimeCtx := c.runtime.Context()
	if runtimeCtx == nil {
		return nil, ErrRuntimeNotReady
	}

	path, err := c.runtime.OpenDirectoryDialog(runtimeCtx, request.Title)
	if err != nil {
		return nil, err
	}

	return SelectDirectoryResponse{Path: path}, nil
}

type PickPluginArchiveCommand struct {
	runtime Runtime
}

func NewPickPluginArchiveCommand(runtime Runtime) *PickPluginArchiveCommand {
	return &PickPluginArchiveCommand{runtime: runtime}
}

func (c *PickPluginArchiveCommand) Name() string {
	return PickPluginArchiveName
}

func (c *PickPluginArchiveCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[PickFileRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	runtimeCtx := c.runtime.Context()
	if runtimeCtx == nil {
		return nil, ErrRuntimeNotReady
	}

	path, err := c.runtime.OpenFileDialog(runtimeCtx, request.Title, request.Filters)
	if err != nil {
		return nil, err
	}

	return PickFileResponse{Path: path}, nil
}

type PickImageCommand struct {
	runtime Runtime
}

func NewPickImageCommand(runtime Runtime) *PickImageCommand {
	return &PickImageCommand{runtime: runtime}
}

func (c *PickImageCommand) Name() string {
	return PickImageName
}

func (c *PickImageCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[PickFileRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	runtimeCtx := c.runtime.Context()
	if runtimeCtx == nil {
		return nil, ErrRuntimeNotReady
	}

	path, err := c.runtime.OpenFileDialog(runtimeCtx, request.Title, request.Filters)
	if err != nil {
		return nil, err
	}

	return PickFileResponse{Path: path}, nil
}
