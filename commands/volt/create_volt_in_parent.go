package volt

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"

	commandbase "volt/commands"
	domain "volt/core/volt"
)

const CreateInParentName = "volt.createInParent"

type CreateInParentRequest struct {
	Name          string
	ParentPath    string
	DirectoryName string
}

type CreateInParentResponse struct {
	Volt *domain.Volt
}

type CreateInParentCommand struct {
	repo domain.Repository
}

func NewCreateInParentCommand(repo domain.Repository) *CreateInParentCommand {
	return &CreateInParentCommand{repo: repo}
}

func (c *CreateInParentCommand) Name() string {
	return CreateInParentName
}

func (c *CreateInParentCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[CreateInParentRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	parentPath := strings.TrimSpace(request.ParentPath)
	directoryName := strings.TrimSpace(request.DirectoryName)
	if parentPath == "" || directoryName == "" || directoryName == "." || directoryName == ".." {
		return nil, domain.ErrPathNotAccessible
	}
	if strings.Contains(directoryName, "/") || strings.Contains(directoryName, `\`) {
		return nil, domain.ErrPathNotAccessible
	}

	info, err := os.Stat(parentPath)
	if err != nil || !info.IsDir() {
		return nil, domain.ErrPathNotAccessible
	}

	testFile := filepath.Join(parentPath, ".volt_write_test")
	f, err := os.Create(testFile)
	if err != nil {
		return nil, domain.ErrPathNotAccessible
	}
	_ = f.Close()
	_ = os.Remove(testFile)

	targetPath := filepath.Join(parentPath, directoryName)
	if _, err := os.Stat(targetPath); err == nil {
		return nil, domain.ErrAlreadyExists
	} else if !os.IsNotExist(err) {
		return nil, domain.ErrPathNotAccessible
	}

	if err := os.Mkdir(targetPath, 0755); err != nil {
		if os.IsExist(err) {
			return nil, domain.ErrAlreadyExists
		}
		return nil, domain.ErrPathNotAccessible
	}

	v := &domain.Volt{
		ID:        uuid.New().String(),
		Name:      request.Name,
		Path:      targetPath,
		CreatedAt: time.Now(),
	}

	if err := c.repo.Create(v); err != nil {
		_ = os.Remove(targetPath)
		return nil, err
	}

	return CreateInParentResponse{Volt: v}, nil
}
