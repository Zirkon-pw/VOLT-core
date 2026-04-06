package wailshandler

import (
	"encoding/json"

	appstorage "volt/backend/application/storage"
	domain "volt/backend/domain/storage"
)

type StorageHandler struct {
	service *appstorage.Service
}

func NewStorageHandler(service *appstorage.Service) *StorageHandler {
	return &StorageHandler{service: service}
}

func (h *StorageHandler) ConfigDir() string {
	return h.service.ConfigDir()
}

func (h *StorageHandler) Get(namespace, key string) (json.RawMessage, error) {
	return h.service.Get(namespace, key)
}

func (h *StorageHandler) Set(namespace, key string, value json.RawMessage) error {
	return h.service.Set(namespace, key, value)
}

func (h *StorageHandler) Delete(namespace, key string) error {
	return h.service.Delete(namespace, key)
}

func (h *StorageHandler) List(namespace string) ([]domain.KVEntry, error) {
	return h.service.List(namespace)
}
