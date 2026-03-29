package note

import (
	"context"

	commandbase "volt/commands"
	domain "volt/core/note"
)

const ReadName = "note.read"

type ReadRequest struct {
	VoltPath string
	FilePath string
}

type ReadResponse struct {
	Content string
}

type ReadCommand struct {
	repo domain.Repository
}

func NewReadCommand(repo domain.Repository) *ReadCommand {
	return &ReadCommand{repo: repo}
}

func (c *ReadCommand) Name() string {
	return ReadName
}

func (c *ReadCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[ReadRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	content, err := c.repo.ReadFile(request.VoltPath, request.FilePath)
	if err != nil {
		return nil, err
	}

	return ReadResponse{Content: content}, nil
}
