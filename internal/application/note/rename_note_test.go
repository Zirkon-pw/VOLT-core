package note

import (
	"strings"
	"testing"

	domain "volt/core/note"
)

type renameRepoStub struct {
	files map[string]string
	tree  []domain.FileEntry
}

func (s *renameRepoStub) ReadFile(_ string, filePath string) (string, error) {
	return s.files[filePath], nil
}

func (s *renameRepoStub) WriteFile(_ string, filePath, content string) error {
	s.files[filePath] = content
	return nil
}

func (s *renameRepoStub) ListDirectory(_ string, _ string) ([]domain.FileEntry, error) {
	return s.tree, nil
}

func (s *renameRepoStub) CreateFile(_ string, _ string) error {
	return nil
}

func (s *renameRepoStub) CreateDirectory(_ string, _ string) error {
	return nil
}

func (s *renameRepoStub) DeleteFile(_ string, _ string) error {
	return nil
}

func (s *renameRepoStub) RenameFile(_ string, oldPath, newPath string) error {
	if content, ok := s.files[oldPath]; ok {
		delete(s.files, oldPath)
		s.files[newPath] = content
	}
	return nil
}

func TestRenameNoteUseCaseRewritesBoardLinks(t *testing.T) {
	repo := &renameRepoStub{
		files: map[string]string{
			"notes/idea.md": `# idea`,
			"boards/roadmap.board": `{
  "elements": [
    {
      "id": "1",
      "type": "rectangle",
      "link": "volt://note/notes%2Fidea.md",
      "customData": {
        "notePath": "notes/idea.md"
      }
    }
  ]
}`,
		},
		tree: []domain.FileEntry{
			{
				Name:  "notes",
				Path:  "notes",
				IsDir: true,
				Children: []domain.FileEntry{
					{Name: "idea.md", Path: "notes/idea.md", IsDir: false},
				},
			},
			{
				Name:  "boards",
				Path:  "boards",
				IsDir: true,
				Children: []domain.FileEntry{
					{Name: "roadmap.board", Path: "boards/roadmap.board", IsDir: false},
				},
			},
		},
	}

	useCase := NewRenameNoteUseCase(repo)
	if err := useCase.Execute("/tmp/volt", "notes/idea.md", "notes/renamed.md"); err != nil {
		t.Fatalf("Execute() error = %v", err)
	}

	board := repo.files["boards/roadmap.board"]
	if board == "" {
		t.Fatalf("expected board file to remain after rename")
	}

	if want := "volt://note/notes%2Frenamed.md"; !strings.Contains(board, want) {
		t.Fatalf("board payload %q does not contain %q", board, want)
	}

	if want := `"notePath": "notes/renamed.md"`; !strings.Contains(board, want) {
		t.Fatalf("board payload %q does not contain %q", board, want)
	}
}
