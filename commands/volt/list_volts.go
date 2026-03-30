package volt

import (
	"context"

	commandbase "volt/commands"
	domain "volt/core/volt"
)

const ListName = "volt.list"

type ListRequest struct{}

type ListResponse struct {
	Volts []domain.Volt
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

	volts, err := c.repo.List()
	if err != nil {
		return nil, err
	}

	return ListResponse{Volts: volts}, nil
}
