package note

import (
	"strings"

	domain "volt/core/note"
	"volt/internal/application/boardjson"
)

type RenameNoteUseCase struct {
	repo domain.Repository
}

func NewRenameNoteUseCase(repo domain.Repository) *RenameNoteUseCase {
	return &RenameNoteUseCase{repo: repo}
}

func (uc *RenameNoteUseCase) Execute(voltPath, oldPath, newPath string) error {
	if err := uc.repo.RenameFile(voltPath, oldPath, newPath); err != nil {
		return err
	}

	uc.rewriteBoardLinksBestEffort(voltPath, oldPath, newPath)
	return nil
}

func (uc *RenameNoteUseCase) rewriteBoardLinksBestEffort(voltPath, oldPath, newPath string) {
	entries, err := uc.repo.ListDirectory(voltPath, "")
	if err != nil {
		return
	}

	for _, boardPath := range collectBoardPaths(entries) {
		raw, err := uc.repo.ReadFile(voltPath, boardPath)
		if err != nil {
			continue
		}

		updated, changed, err := boardjson.RewriteNoteLinks(raw, oldPath, newPath)
		if err != nil || !changed {
			continue
		}

		_ = uc.repo.WriteFile(voltPath, boardPath, updated)
	}
}

func collectBoardPaths(entries []domain.FileEntry) []string {
	paths := make([]string, 0)

	for _, entry := range entries {
		if entry.IsDir {
			paths = append(paths, collectBoardPaths(entry.Children)...)
			continue
		}

		if strings.HasSuffix(strings.ToLower(entry.Path), ".board") {
			paths = append(paths, entry.Path)
		}
	}

	return paths
}
