package wailshandler

import (
	"errors"

	corenote "volt/core/note"
	corevolt "volt/core/volt"
	appsettings "volt/internal/application/settings"
)

func translate(localization *appsettings.LocalizationService, key string, params map[string]any) string {
	if localization == nil {
		return key
	}
	return localization.Translate(key, params)
}

func localizedUnexpectedError(localization *appsettings.LocalizationService, actionKey string, params map[string]any, err error) error {
	action := translate(localization, actionKey, params)
	return errors.New(translate(localization, "backend.error.withDetail", map[string]any{
		"action": action,
		"detail": err.Error(),
	}))
}

func localizedVoltError(localization *appsettings.LocalizationService, actionKey string, params map[string]any, err error) error {
	switch {
	case errors.Is(err, corevolt.ErrNotFound):
		return errors.New(translate(localization, "backend.error.volt.notFound", nil))
	case errors.Is(err, corevolt.ErrPathNotAccessible):
		return errors.New(translate(localization, "backend.error.volt.pathNotAccessible", nil))
	case errors.Is(err, corevolt.ErrAlreadyExists):
		return errors.New(translate(localization, "backend.error.volt.alreadyExists", nil))
	default:
		return localizedUnexpectedError(localization, actionKey, params, err)
	}
}

func localizedNoteError(localization *appsettings.LocalizationService, actionKey string, params map[string]any, err error) error {
	switch {
	case errors.Is(err, corenote.ErrFileNotFound):
		return errors.New(translate(localization, "backend.error.note.notFound", nil))
	case errors.Is(err, corenote.ErrPermissionDenied):
		return errors.New(translate(localization, "backend.error.note.permissionDenied", nil))
	case errors.Is(err, corenote.ErrPathTraversal):
		return errors.New(translate(localization, "backend.error.note.pathTraversal", nil))
	case errors.Is(err, corenote.ErrAlreadyExists):
		return errors.New(translate(localization, "backend.error.note.alreadyExists", nil))
	default:
		return localizedUnexpectedError(localization, actionKey, params, err)
	}
}

func localizedImageError(localization *appsettings.LocalizationService, actionKey string, params map[string]any, err error) error {
	return localizedUnexpectedError(localization, actionKey, params, err)
}

func quotedPathParam(path string) map[string]any {
	return map[string]any{"path": path}
}

func renameParams(oldPath, newPath string) map[string]any {
	return map[string]any{
		"oldPath": oldPath,
		"newPath": newPath,
	}
}

func fmtKeyValue(key string, value any) map[string]any {
	return map[string]any{key: value}
}
