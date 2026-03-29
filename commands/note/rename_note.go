package note

import (
	"context"
	"strings"

	commandbase "volt/commands"
	"volt/core/boardjson"
	domain "volt/core/note"
)

const RenameName = "note.rename"

type RenameRequest struct {
	VoltPath string
	OldPath  string
	NewPath  string
}

type RenameResponse struct{}

type RenameCommand struct {
	repo domain.Repository
}

func NewRenameCommand(repo domain.Repository) *RenameCommand {
	return &RenameCommand{repo: repo}
}

func (c *RenameCommand) Name() string {
	return RenameName
}

func (c *RenameCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[RenameRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	if err := c.repo.RenameFile(request.VoltPath, request.OldPath, request.NewPath); err != nil {
		return nil, err
	}

	c.rewriteBoardLinksBestEffort(request.VoltPath, request.OldPath, request.NewPath)
	return RenameResponse{}, nil
}

func (c *RenameCommand) rewriteBoardLinksBestEffort(voltPath, oldPath, newPath string) {
	entries, err := c.repo.ListDirectory(voltPath, "")
	if err != nil {
		return
	}

	for _, boardPath := range collectBoardPaths(entries) {
		raw, err := c.repo.ReadFile(voltPath, boardPath)
		if err != nil {
			continue
		}

		updated, changed, err := boardjson.RewriteNoteLinks(raw, oldPath, newPath)
		if err != nil || !changed {
			continue
		}

		_ = c.repo.WriteFile(voltPath, boardPath, updated)
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
