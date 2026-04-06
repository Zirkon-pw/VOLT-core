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

func (h *FileHandler) ReadFile(voltPath, filePath string) (string, error) {
	return h.service.Read(voltPath, filePath)
}

func (h *FileHandler) WriteFile(voltPath, filePath, content string) error {
	return h.service.Write(voltPath, filePath, content)
}

func (h *FileHandler) ListTree(voltPath, dirPath string) ([]domain.FileEntry, error) {
	return h.service.ListTree(voltPath, dirPath)
}

func (h *FileHandler) CreateFile(voltPath, filePath, content string) error {
	return h.service.CreateFile(voltPath, filePath, content)
}

func (h *FileHandler) CreateDirectory(voltPath, dirPath string) error {
	return h.service.CreateDirectory(voltPath, dirPath)
}

func (h *FileHandler) DeletePath(voltPath, filePath string) error {
	return h.service.Delete(voltPath, filePath)
}

func (h *FileHandler) RenamePath(voltPath, oldPath, newPath string) error {
	return h.service.Rename(voltPath, oldPath, newPath)
}
