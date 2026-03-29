package note

import (
	"context"
	"strings"

	commandbase "volt/commands"
	domain "volt/core/note"
)

const CreateNoteName = "note.createNote"

type CreateNoteRequest struct {
	VoltPath string
	FilePath string
}

type CreateNoteResponse struct{}

type CreateNoteCommand struct {
	repo domain.Repository
}

func NewCreateNoteCommand(repo domain.Repository) *CreateNoteCommand {
	return &CreateNoteCommand{repo: repo}
}

func (c *CreateNoteCommand) Name() string {
	return CreateNoteName
}

func (c *CreateNoteCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[CreateNoteRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	filePath := request.FilePath
	if !strings.HasSuffix(filePath, ".md") {
		filePath += ".md"
	}

	if err := c.repo.CreateFile(request.VoltPath, filePath); err != nil {
		return nil, err
	}

	return CreateNoteResponse{}, nil
}
