package wailshandler

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"
	"time"

	appsettings "volt/internal/application/settings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type ImageHandler struct {
	ctx          context.Context
	localization *appsettings.LocalizationService
}

func NewImageHandler(localization *appsettings.LocalizationService) *ImageHandler {
	return &ImageHandler{
		localization: localization,
	}
}

func (h *ImageHandler) SetContext(ctx context.Context) {
	h.ctx = ctx
}

// CopyImage copies an image from sourcePath into the vault's image directory.
// Returns the relative path to the copied image (relative to voltPath).
func (h *ImageHandler) CopyImage(voltPath, sourcePath, imageDir string) (string, error) {
	if imageDir == "" {
		imageDir = "attachments"
	}

	destDir := filepath.Join(voltPath, imageDir)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return "", localizedImageError(h.localization, "backend.action.createImageDirectory", nil, err)
	}

	ext := filepath.Ext(sourcePath)
	baseName := strings.TrimSuffix(filepath.Base(sourcePath), ext)
	destName := baseName + ext

	destPath := filepath.Join(destDir, destName)
	// If file exists, add timestamp
	if _, err := os.Stat(destPath); err == nil {
		destName = fmt.Sprintf("%s_%d%s", baseName, time.Now().UnixMilli(), ext)
		destPath = filepath.Join(destDir, destName)
	}

	src, err := os.Open(sourcePath)
	if err != nil {
		return "", localizedImageError(h.localization, "backend.action.openSourceImage", nil, err)
	}
	defer src.Close()

	dst, err := os.Create(destPath)
	if err != nil {
		return "", localizedImageError(h.localization, "backend.action.createImageDestination", nil, err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return "", localizedImageError(h.localization, "backend.action.copyImage", nil, err)
	}

	relPath := filepath.Join(imageDir, destName)
	return relPath, nil
}

// SaveImageBase64 saves base64-encoded image data to the vault's image directory.
// Used for drag-and-drop and clipboard paste where we don't have a file path.
// Returns the relative path to the saved image.
func (h *ImageHandler) SaveImageBase64(voltPath, fileName, imageDir, b64Data string) (string, error) {
	if imageDir == "" {
		imageDir = "attachments"
	}

	destDir := filepath.Join(voltPath, imageDir)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return "", localizedImageError(h.localization, "backend.action.createImageDirectory", nil, err)
	}

	data, err := base64.StdEncoding.DecodeString(b64Data)
	if err != nil {
		return "", localizedImageError(h.localization, "backend.action.decodeBase64Image", nil, err)
	}

	ext := filepath.Ext(fileName)
	baseName := strings.TrimSuffix(fileName, ext)
	if ext == "" {
		ext = ".png"
	}
	destName := baseName + ext

	destPath := filepath.Join(destDir, destName)
	if _, err := os.Stat(destPath); err == nil {
		destName = fmt.Sprintf("%s_%d%s", baseName, time.Now().UnixMilli(), ext)
		destPath = filepath.Join(destDir, destName)
	}

	if err := os.WriteFile(destPath, data, 0644); err != nil {
		return "", localizedImageError(h.localization, "backend.action.writeImageFile", nil, err)
	}

	relPath := filepath.Join(imageDir, destName)
	return relPath, nil
}

// PickImage opens a native file dialog and returns the selected image path.
// Returns empty string if cancelled.
func (h *ImageHandler) PickImage() (string, error) {
	selection, err := runtime.OpenFileDialog(h.ctx, runtime.OpenDialogOptions{
		Title: translate(h.localization, "dialog.selectImage", nil),
		Filters: []runtime.FileFilter{
			{
				DisplayName: translate(h.localization, "dialog.imagesFilter", nil),
				Pattern:     "*.png;*.jpg;*.jpeg;*.gif;*.webp;*.svg",
			},
		},
	})
	if err != nil {
		return "", localizedImageError(h.localization, "backend.action.openImageDialog", nil, err)
	}
	return selection, nil
}

// ReadImageBase64 reads an image file from the vault and returns it as a data URL.
// Format: "data:<mime>;base64,<data>"
func (h *ImageHandler) ReadImageBase64(voltPath, relPath string) (string, error) {
	clean := filepath.Clean(relPath)
	if strings.Contains(clean, "..") {
		return "", fmt.Errorf("%s", translate(h.localization, "backend.error.image.invalidPath", nil))
	}

	fullPath := filepath.Join(voltPath, clean)

	absVault, err := filepath.Abs(voltPath)
	if err != nil {
		return "", localizedImageError(h.localization, "backend.action.resolveVoltPath", nil, err)
	}
	absFile, err := filepath.Abs(fullPath)
	if err != nil {
		return "", localizedImageError(h.localization, "backend.action.resolveFilePath", nil, err)
	}
	if !strings.HasPrefix(absFile, absVault) {
		return "", fmt.Errorf("%s", translate(h.localization, "backend.error.image.pathTraversalDetected", nil))
	}

	data, err := os.ReadFile(fullPath)
	if err != nil {
		return "", localizedImageError(h.localization, "backend.action.readImageFile", nil, err)
	}

	ct := mime.TypeByExtension(filepath.Ext(fullPath))
	if ct == "" {
		ct = "application/octet-stream"
	}

	encoded := base64.StdEncoding.EncodeToString(data)
	return fmt.Sprintf("data:%s;base64,%s", ct, encoded), nil
}
