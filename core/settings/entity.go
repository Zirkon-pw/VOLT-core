package settings

const AutoLocale = "auto"

type AppSettings struct {
	Locale string `json:"locale"`
}

func DefaultAppSettings() AppSettings {
	return AppSettings{
		Locale: AutoLocale,
	}
}

type AvailableLocale struct {
	Code   string `json:"code"`
	Label  string `json:"label"`
	Source string `json:"source"`
}

type LocalizationPayload struct {
	SelectedLocale   string            `json:"selectedLocale"`
	EffectiveLocale  string            `json:"effectiveLocale"`
	AvailableLocales []AvailableLocale `json:"availableLocales"`
	Messages         map[string]string `json:"messages"`
}
