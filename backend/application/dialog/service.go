package dialog

import (
	"context"
	"errors"

	domain "volt/backend/domain/dialog"
	domainprocess "volt/backend/domain/process"
)

type RuntimeContextProvider interface {
	Context() context.Context
}

type Service struct {
	repo    domain.Repository
	runtime RuntimeContextProvider
}

func NewService(repo domain.Repository, runtime RuntimeContextProvider) *Service {
	return &Service{repo: repo, runtime: runtime}
}

func (s *Service) SelectDirectory(title string) (string, error) {
	ctx := s.runtime.Context()
	if ctx == nil {
		return "", domainprocess.ErrRuntimeNotReady
	}

	return s.repo.OpenDirectoryDialog(ctx, title)
}

func (s *Service) PickFiles(title string, filters []domain.FileFilter, multiple bool) ([]string, error) {
	ctx := s.runtime.Context()
	if ctx == nil {
		return nil, domainprocess.ErrRuntimeNotReady
	}

	if multiple {
		paths, err := s.repo.OpenMultipleFilesDialog(ctx, title, filters)
		if err != nil {
			return nil, err
		}
		return paths, nil
	}

	path, err := s.repo.OpenFileDialog(ctx, title, filters)
	if err != nil {
		return nil, err
	}

	if path == "" {
		return []string{}, nil
	}

	return []string{path}, nil
}

func (s *Service) PickImage() (string, error) {
	ctx := s.runtime.Context()
	if ctx == nil {
		return "", domainprocess.ErrRuntimeNotReady
	}

	imageFilters := []domain.FileFilter{
		{DisplayName: "Images", Pattern: "*.png;*.jpg;*.jpeg;*.gif;*.webp;*.svg;*.bmp"},
	}

	path, err := s.repo.OpenFileDialog(ctx, "Select Image", imageFilters)
	if err != nil {
		return "", err
	}

	return path, nil
}

// ErrRuntimeNotReady is re-exported for convenience.
var ErrRuntimeNotReady = errors.New("application context is not ready")
