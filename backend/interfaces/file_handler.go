package wailshandler

import (
	appfile "volt/backend/application/file"
	domain "volt/backend/domain/file"
)

type FileHandler struct {
	service *appfile.Service
}

func NewFileHandler(service *appfile.Service) *FileHandler {
	return &FileHandler{service: service}
}

func (h *FileHandler) Read(rootPath, path string) (string, error) {
	return h.service.Read(rootPath, path)
}

func (h *FileHandler) Write(rootPath, path, content string) error {
	return h.service.Write(rootPath, path, content)
}

func (h *FileHandler) ListTree(rootPath, path string) ([]domain.FileEntry, error) {
	return h.service.ListTree(rootPath, path)
}

func (h *FileHandler) CreateFile(rootPath, path, content string) error {
	return h.service.CreateFile(rootPath, path, content)
}

func (h *FileHandler) CreateDirectory(rootPath, path string) error {
	return h.service.CreateDirectory(rootPath, path)
}

func (h *FileHandler) Delete(rootPath, path string) error {
	return h.service.Delete(rootPath, path)
}

func (h *FileHandler) Rename(rootPath, oldPath, newPath string) error {
	return h.service.Rename(rootPath, oldPath, newPath)
}
