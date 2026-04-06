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

func (s *Service) Read(rootPath, path string) (string, error) {
	return s.repo.Read(rootPath, path)
}

func (s *Service) Write(rootPath, path, content string) error {
	return s.repo.Write(rootPath, path, content)
}

func (s *Service) ListTree(rootPath, path string) ([]domain.FileEntry, error) {
	return s.repo.ListTree(rootPath, path)
}

func (s *Service) CreateFile(rootPath, path, content string) error {
	if err := s.repo.CreateFile(rootPath, path); err != nil {
		return err
	}

	if content == "" {
		return nil
	}

	return s.repo.Write(rootPath, path, content)
}

func (s *Service) CreateDirectory(rootPath, path string) error {
	return s.repo.CreateDirectory(rootPath, path)
}

func (s *Service) Delete(rootPath, path string) error {
	return s.repo.Delete(rootPath, path)
}

func (s *Service) Rename(rootPath, oldPath, newPath string) error {
	return s.repo.Rename(rootPath, oldPath, newPath)
}
