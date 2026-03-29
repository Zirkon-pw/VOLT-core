package wailshandler

import (
	"context"

	commandbase "volt/commands"
	commandsettings "volt/commands/settings"
	coresettings "volt/core/settings"
)

type SettingsHandler struct {
	manager *commandbase.Manager
}

func NewSettingsHandler(manager *commandbase.Manager) *SettingsHandler {
	return &SettingsHandler{
		manager: manager,
	}
}

func (h *SettingsHandler) GetLocalization(preferredLocales []string) (coresettings.LocalizationPayload, error) {
	result, err := commandbase.Execute[commandsettings.GetLocalizationResponse](
		context.Background(),
		h.manager,
		commandsettings.GetLocalizationName,
		commandsettings.GetLocalizationRequest{PreferredLocales: preferredLocales},
	)
	if err != nil {
		return coresettings.LocalizationPayload{}, err
	}

	return result.Payload, nil
}

func (h *SettingsHandler) SetLocale(locale string, preferredLocales []string) (coresettings.LocalizationPayload, error) {
	result, err := commandbase.Execute[commandsettings.SetLocaleResponse](
		context.Background(),
		h.manager,
		commandsettings.SetLocaleName,
		commandsettings.SetLocaleRequest{
			Locale:           locale,
			PreferredLocales: preferredLocales,
		},
	)
	if err != nil {
		return coresettings.LocalizationPayload{}, err
	}

	return result.Payload, nil
}
