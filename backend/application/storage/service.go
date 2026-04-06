package storage

import (
	"encoding/json"

	domain "volt/backend/domain/storage"
)

type Service struct {
	repo domain.Repository
}

func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ConfigDir() string {
	return s.repo.ConfigDir()
}

func (s *Service) Get(namespace, key string) (json.RawMessage, error) {
	return s.repo.Get(namespace, key)
}

func (s *Service) Set(namespace, key string, value json.RawMessage) error {
	return s.repo.Set(namespace, key, value)
}

func (s *Service) Delete(namespace, key string) error {
	return s.repo.Delete(namespace, key)
}

func (s *Service) List(namespace string) ([]domain.KVEntry, error) {
	return s.repo.List(namespace)
}
