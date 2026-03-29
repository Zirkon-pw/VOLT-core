package note

import (
	"context"

	commandbase "volt/commands"
	domain "volt/core/note"
)

const SaveName = "note.save"

type SaveRequest struct {
	VoltPath string
	FilePath string
	Content  string
}

type SaveResponse struct{}

type SaveCommand struct {
	repo domain.Repository
}

func NewSaveCommand(repo domain.Repository) *SaveCommand {
	return &SaveCommand{repo: repo}
}

func (c *SaveCommand) Name() string {
	return SaveName
}

func (c *SaveCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[SaveRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	if err := c.repo.WriteFile(request.VoltPath, request.FilePath, request.Content); err != nil {
		return nil, err
	}

	return SaveResponse{}, nil
}
