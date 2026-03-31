package volt

import (
	"context"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"

	commandbase "volt/commands"
	domain "volt/core/volt"
)

const CreateName = "volt.create"

type CreateRequest struct {
	Name string
	Path string
}

type CreateResponse struct {
	Volt *domain.Volt
}

type CreateCommand struct {
	repo domain.Repository
}

func NewCreateCommand(repo domain.Repository) *CreateCommand {
	return &CreateCommand{repo: repo}
}

func (c *CreateCommand) Name() string {
	return CreateName
}

func (c *CreateCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[CreateRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	// Validate that the path exists and is accessible
	info, err := os.Stat(request.Path)
	if err != nil {
		return nil, domain.ErrPathNotAccessible
	}
	if !info.IsDir() {
		return nil, domain.ErrPathNotAccessible
	}

	// Check write access by attempting to create a temp file
	testFile := filepath.Join(request.Path, ".volt_write_test")
	f, err := os.Create(testFile)
	if err != nil {
		return nil, domain.ErrPathNotAccessible
	}
	f.Close()
	os.Remove(testFile)

	v := &domain.Volt{
		ID:        uuid.New().String(),
		Name:      request.Name,
		Path:      request.Path,
		CreatedAt: time.Now(),
	}

	if err := c.repo.Create(v); err != nil {
		return nil, err
	}

	return CreateResponse{Volt: v}, nil
}
