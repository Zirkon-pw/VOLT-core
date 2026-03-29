package note

import (
	"context"

	commandbase "volt/commands"
	domain "volt/core/note"
)

const DeleteName = "note.delete"

type DeleteRequest struct {
	VoltPath string
	FilePath string
}

type DeleteResponse struct{}

type DeleteCommand struct {
	repo domain.Repository
}

func NewDeleteCommand(repo domain.Repository) *DeleteCommand {
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

	if err := c.repo.DeleteFile(request.VoltPath, request.FilePath); err != nil {
		return nil, err
	}

	return DeleteResponse{}, nil
}
