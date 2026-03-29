package settings

import (
	"os"
	"path/filepath"
	"testing"
)

type stubSettingsRepo struct {
	settings AppSettings
}

func (s *stubSettingsRepo) Get() (AppSettings, error) {
	return s.settings, nil
}

func (s *stubSettingsRepo) Save(settings AppSettings) error {
	s.settings = settings
	return nil
}

func TestLocalizationServiceFallbacksToEnglish(t *testing.T) {
	repo := &stubSettingsRepo{settings: AppSettings{Locale: AutoLocale}}
	service, err := NewLocalizationService(repo, filepath.Join(t.TempDir(), "locales"))
	if err != nil {
		t.Fatalf("NewLocalizationService() error = %v", err)
	}

	payload, err := service.GetLocalization([]string{"fr-FR"})
	if err != nil {
		t.Fatalf("GetLocalization() error = %v", err)
	}

	if payload.EffectiveLocale != "en" {
		t.Fatalf("effective locale = %q, want %q", payload.EffectiveLocale, "en")
	}

	if payload.Messages["settings.title"] != "Settings" {
		t.Fatalf("settings.title = %q, want %q", payload.Messages["settings.title"], "Settings")
	}
}

func TestLocalizationServiceResolvesBaseLocale(t *testing.T) {
	repo := &stubSettingsRepo{settings: AppSettings{Locale: AutoLocale}}
	service, err := NewLocalizationService(repo, filepath.Join(t.TempDir(), "locales"))
	if err != nil {
		t.Fatalf("NewLocalizationService() error = %v", err)
	}

	payload, err := service.GetLocalization([]string{"ru-BY"})
	if err != nil {
		t.Fatalf("GetLocalization() error = %v", err)
	}

	if payload.EffectiveLocale != "ru" {
		t.Fatalf("effective locale = %q, want %q", payload.EffectiveLocale, "ru")
	}
}

func TestLocalizationServiceMergesCustomLocale(t *testing.T) {
	localeDir := filepath.Join(t.TempDir(), "locales")
	repo := &stubSettingsRepo{settings: AppSettings{Locale: "ru"}}
	service, err := NewLocalizationService(repo, localeDir)
	if err != nil {
		t.Fatalf("NewLocalizationService() error = %v", err)
	}

	customLocale := `{
  "label": "Русский (кастом)",
  "messages": {
    "settings.title": "Мои настройки",
    "custom.only": "Пользовательское значение"
  }
}`
	if err := os.WriteFile(filepath.Join(localeDir, "ru.json"), []byte(customLocale), 0644); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}

	payload, err := service.GetLocalization(nil)
	if err != nil {
		t.Fatalf("GetLocalization() error = %v", err)
	}

	if payload.Messages["settings.title"] != "Мои настройки" {
		t.Fatalf("settings.title = %q, want %q", payload.Messages["settings.title"], "Мои настройки")
	}

	if payload.Messages["custom.only"] != "Пользовательское значение" {
		t.Fatalf("custom.only = %q, want %q", payload.Messages["custom.only"], "Пользовательское значение")
	}

	foundCustom := false
	for _, locale := range payload.AvailableLocales {
		if locale.Code == "ru" {
			foundCustom = locale.Source == customLocaleSource && locale.Label == "Русский (кастом)"
		}
	}

	if !foundCustom {
		t.Fatalf("expected custom ru locale in available locales: %#v", payload.AvailableLocales)
	}
}

func TestLocalizationServiceSupportsNewCustomLocale(t *testing.T) {
	localeDir := filepath.Join(t.TempDir(), "locales")
	repo := &stubSettingsRepo{settings: AppSettings{Locale: AutoLocale}}
	service, err := NewLocalizationService(repo, localeDir)
	if err != nil {
		t.Fatalf("NewLocalizationService() error = %v", err)
	}

	customLocale := `{
  "label": "Deutsch",
  "messages": {
    "settings.title": "Einstellungen"
  }
}`
	if err := os.WriteFile(filepath.Join(localeDir, "de.json"), []byte(customLocale), 0644); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}

	payload, err := service.GetLocalization([]string{"de-DE"})
	if err != nil {
		t.Fatalf("GetLocalization() error = %v", err)
	}

	if payload.EffectiveLocale != "de" {
		t.Fatalf("effective locale = %q, want %q", payload.EffectiveLocale, "de")
	}

	if payload.Messages["settings.title"] != "Einstellungen" {
		t.Fatalf("settings.title = %q, want %q", payload.Messages["settings.title"], "Einstellungen")
	}

	if payload.Messages["common.close"] != "Close" {
		t.Fatalf("common.close fallback = %q, want %q", payload.Messages["common.close"], "Close")
	}
}

func TestLocalizationServiceFallsBackWhenSavedLocaleMissing(t *testing.T) {
	repo := &stubSettingsRepo{settings: AppSettings{Locale: "de"}}
	service, err := NewLocalizationService(repo, filepath.Join(t.TempDir(), "locales"))
	if err != nil {
		t.Fatalf("NewLocalizationService() error = %v", err)
	}

	payload, err := service.GetLocalization([]string{"ru-RU"})
	if err != nil {
		t.Fatalf("GetLocalization() error = %v", err)
	}

	if payload.EffectiveLocale != "ru" {
		t.Fatalf("effective locale = %q, want %q", payload.EffectiveLocale, "ru")
	}
}

func TestLocalizationServiceSetLocalePersistsSelection(t *testing.T) {
	repo := &stubSettingsRepo{settings: DefaultAppSettings()}
	service, err := NewLocalizationService(repo, filepath.Join(t.TempDir(), "locales"))
	if err != nil {
		t.Fatalf("NewLocalizationService() error = %v", err)
	}

	payload, err := service.SetLocale("ru", []string{"en-US"})
	if err != nil {
		t.Fatalf("SetLocale() error = %v", err)
	}

	if repo.settings.Locale != "ru" {
		t.Fatalf("saved locale = %q, want %q", repo.settings.Locale, "ru")
	}

	if payload.EffectiveLocale != "ru" {
		t.Fatalf("effective locale = %q, want %q", payload.EffectiveLocale, "ru")
	}
}
