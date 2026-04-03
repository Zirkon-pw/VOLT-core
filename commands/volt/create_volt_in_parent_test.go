package volt

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	corevolt "volt/core/volt"
)

type createVoltInParentRepoStub struct {
	created *corevolt.Volt
	err     error
}

func (s *createVoltInParentRepoStub) List() ([]corevolt.Volt, error) { return nil, nil }
func (s *createVoltInParentRepoStub) GetByID(id string) (*corevolt.Volt, error) {
	return nil, corevolt.ErrNotFound
}
func (s *createVoltInParentRepoStub) Create(v *corevolt.Volt) error {
	if s.err != nil {
		return s.err
	}
	copy := *v
	s.created = &copy
	return nil
}
func (s *createVoltInParentRepoStub) Delete(id string) error { return nil }
func (s *createVoltInParentRepoStub) Save(volts []corevolt.Volt) error { return nil }

func TestCreateInParentCommandCreatesChildDirectoryAndRegistersVolt(t *testing.T) {
	parentPath := t.TempDir()
	repo := &createVoltInParentRepoStub{}

	command := NewCreateInParentCommand(repo)
	resultRaw, err := command.Execute(context.Background(), CreateInParentRequest{
		Name:          "Research",
		ParentPath:    parentPath,
		DirectoryName: "research-space",
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}

	targetPath := filepath.Join(parentPath, "research-space")
	info, statErr := os.Stat(targetPath)
	if statErr != nil || !info.IsDir() {
		t.Fatalf("expected %q directory to be created, statErr=%v", targetPath, statErr)
	}

	if repo.created == nil || repo.created.Path != targetPath {
		t.Fatalf("repo.created = %#v, want path %q", repo.created, targetPath)
	}

	result, ok := resultRaw.(CreateInParentResponse)
	if !ok {
		t.Fatalf("unexpected response type %T", resultRaw)
	}

	if result.Volt == nil || result.Volt.Path != targetPath {
		t.Fatalf("result.Volt = %#v, want path %q", result.Volt, targetPath)
	}
}

func TestCreateInParentCommandRejectsExistingChildDirectory(t *testing.T) {
	parentPath := t.TempDir()
	targetPath := filepath.Join(parentPath, "workspace")
	if err := os.Mkdir(targetPath, 0755); err != nil {
		t.Fatalf("Mkdir() error = %v", err)
	}

	command := NewCreateInParentCommand(&createVoltInParentRepoStub{})
	_, err := command.Execute(context.Background(), CreateInParentRequest{
		Name:          "Workspace",
		ParentPath:    parentPath,
		DirectoryName: "workspace",
	})
	if !errors.Is(err, corevolt.ErrAlreadyExists) {
		t.Fatalf("error = %v, want %v", err, corevolt.ErrAlreadyExists)
	}
}

func TestCreateInParentCommandRemovesCreatedDirectoryWhenRepositoryFails(t *testing.T) {
	parentPath := t.TempDir()
	repo := &createVoltInParentRepoStub{err: corevolt.ErrAlreadyExists}

	command := NewCreateInParentCommand(repo)
	_, err := command.Execute(context.Background(), CreateInParentRequest{
		Name:          "Workspace",
		ParentPath:    parentPath,
		DirectoryName: "workspace",
	})
	if !errors.Is(err, corevolt.ErrAlreadyExists) {
		t.Fatalf("error = %v, want %v", err, corevolt.ErrAlreadyExists)
	}

	if _, statErr := os.Stat(filepath.Join(parentPath, "workspace")); !os.IsNotExist(statErr) {
		t.Fatalf("expected created directory to be cleaned up, statErr=%v", statErr)
	}
}
