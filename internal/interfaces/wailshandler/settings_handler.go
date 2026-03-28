package wailshandler

import (
	coresettings "volt/core/settings"
	appsettings "volt/internal/application/settings"
)

type SettingsHandler struct {
	localization *appsettings.LocalizationService
}

func NewSettingsHandler(localization *appsettings.LocalizationService) *SettingsHandler {
	return &SettingsHandler{
		localization: localization,
	}
}

func (h *SettingsHandler) GetLocalization(preferredLocales []string) (coresettings.LocalizationPayload, error) {
	return h.localization.GetLocalization(preferredLocales)
}

func (h *SettingsHandler) SetLocale(locale string, preferredLocales []string) (coresettings.LocalizationPayload, error) {
	return h.localization.SetLocale(locale, preferredLocales)
}
