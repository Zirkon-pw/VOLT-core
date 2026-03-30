package wailshandler

import (
	"context"
	"errors"

	commandbase "volt/commands"
	commandssystem "volt/commands/system"
	coresettings "volt/core/settings"
)

type ImageHandler struct {
	manager      *commandbase.Manager
	localization *coresettings.LocalizationService
}

func NewImageHandler(manager *commandbase.Manager, localization *coresettings.LocalizationService) *ImageHandler {
	return &ImageHandler{
		manager:      manager,
		localization: localization,
	}
}

// CopyImage copies an image from sourcePath into the vault's image directory.
// Returns the relative path to the copied image (relative to voltPath).
func (h *ImageHandler) CopyImage(voltPath, sourcePath, imageDir string) (string, error) {
	result, err := commandbase.Execute[commandssystem.CopyImageResponse](
		context.Background(),
		h.manager,
		commandssystem.CopyImageName,
		commandssystem.CopyImageRequest{
			VoltPath:   voltPath,
			SourcePath: sourcePath,
			ImageDir:   imageDir,
		},
	)
	if err != nil {
		return "", localizedImageError(h.localization, "backend.action.copyImage", nil, err)
	}

	return result.RelativePath, nil
}

// SaveImageBase64 saves base64-encoded image data to the vault's image directory.
// Used for drag-and-drop and clipboard paste where we don't have a file path.
// Returns the relative path to the saved image.
func (h *ImageHandler) SaveImageBase64(voltPath, fileName, imageDir, b64Data string) (string, error) {
	result, err := commandbase.Execute[commandssystem.SaveImageBase64Response](
		context.Background(),
		h.manager,
		commandssystem.SaveImageBase64Name,
		commandssystem.SaveImageBase64Request{
			VoltPath:   voltPath,
			FileName:   fileName,
			ImageDir:   imageDir,
			Base64Data: b64Data,
		},
	)
	if err != nil {
		return "", localizedImageError(h.localization, "backend.action.writeImageFile", nil, err)
	}

	return result.RelativePath, nil
}

// PickImage opens a native file dialog and returns the selected image path.
// Returns empty string if cancelled.
func (h *ImageHandler) PickImage() (string, error) {
	selection, err := commandbase.Execute[commandssystem.PickFileResponse](
		context.Background(),
		h.manager,
		commandssystem.PickImageName,
		commandssystem.PickFileRequest{
			Title: translate(h.localization, "dialog.selectImage", nil),
			Filters: []commandssystem.FileFilter{
				{
					DisplayName: translate(h.localization, "dialog.imagesFilter", nil),
					Pattern:     "*.png;*.jpg;*.jpeg;*.gif;*.webp;*.svg",
				},
			},
		},
	)
	if err != nil {
		return "", localizedImageError(h.localization, "backend.action.openImageDialog", nil, err)
	}
	return selection.Path, nil
}

// ReadImageBase64 reads an image file from the vault and returns it as a data URL.
// Format: "data:<mime>;base64,<data>"
func (h *ImageHandler) ReadImageBase64(voltPath, relPath string) (string, error) {
	result, err := commandbase.Execute[commandssystem.ReadImageBase64Response](
		context.Background(),
		h.manager,
		commandssystem.ReadImageBase64Name,
		commandssystem.ReadImageBase64Request{
			VoltPath: voltPath,
			RelPath:  relPath,
		},
	)
	if err != nil {
		if err.Error() == "invalid path" {
			return "", errors.New(translate(h.localization, "backend.error.image.invalidPath", nil))
		}
		if err.Error() == "path traversal detected" {
			return "", errors.New(translate(h.localization, "backend.error.image.pathTraversalDetected", nil))
		}
		return "", localizedImageError(h.localization, "backend.action.readImageFile", nil, err)
	}
	return result.DataURL, nil
}
