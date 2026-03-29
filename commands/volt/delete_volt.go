package volt

import (
	"context"

	commandbase "volt/commands"
	domain "volt/core/volt"
)

const DeleteName = "volt.delete"

type DeleteRequest struct {
	ID string
}

type DeleteResponse struct{}

type DeleteCommand struct {
	repo domain.Repository
}

func NewDeleteCommand(repo domain.Repository) *DeleteCommand {
	return &DeleteCommand{repo: repo}
}

// Execute removes the volt from the registry.
// It NEVER deletes user files from disk.
func (c *DeleteCommand) Name() string {
	return DeleteName
}

func (c *DeleteCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[DeleteRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	if err := c.repo.Delete(request.ID); err != nil {
		return nil, err
	}

	return DeleteResponse{}, nil
}
