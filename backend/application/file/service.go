package file

import (
	domain "volt/backend/domain/file"
)

type Service struct {
	repo domain.Repository
}

func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Read(voltPath, filePath string) (string, error) {
	return s.repo.ReadFile(voltPath, filePath)
}

func (s *Service) Write(voltPath, filePath, content string) error {
	return s.repo.WriteFile(voltPath, filePath, content)
}

func (s *Service) ListTree(voltPath, dirPath string) ([]domain.FileEntry, error) {
	return s.repo.ListDirectory(voltPath, dirPath)
}

func (s *Service) CreateFile(voltPath, filePath, content string) error {
	if err := s.repo.CreateFile(voltPath, filePath); err != nil {
		return err
	}

	if content == "" {
		return nil
	}

	return s.repo.WriteFile(voltPath, filePath, content)
}

func (s *Service) CreateDirectory(voltPath, dirPath string) error {
	return s.repo.CreateDirectory(voltPath, dirPath)
}

func (s *Service) Delete(voltPath, filePath string) error {
	return s.repo.DeletePath(voltPath, filePath)
}

func (s *Service) Rename(voltPath, oldPath, newPath string) error {
	return s.repo.RenamePath(voltPath, oldPath, newPath)
}
