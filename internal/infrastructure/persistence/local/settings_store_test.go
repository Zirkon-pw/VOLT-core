package local

import (
	"path/filepath"
	"testing"

	coresettings "volt/core/settings"
)

func TestAppSettingsStoreDefaultsToAuto(t *testing.T) {
	store, err := NewAppSettingsStoreWithPath(filepath.Join(t.TempDir(), "settings.json"))
	if err != nil {
		t.Fatalf("NewAppSettingsStoreWithPath() error = %v", err)
	}

	settings, err := store.Get()
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}

	if settings.Locale != coresettings.AutoLocale {
		t.Fatalf("locale = %q, want %q", settings.Locale, coresettings.AutoLocale)
	}
}

func TestAppSettingsStoreRoundTrip(t *testing.T) {
	store, err := NewAppSettingsStoreWithPath(filepath.Join(t.TempDir(), "settings.json"))
	if err != nil {
		t.Fatalf("NewAppSettingsStoreWithPath() error = %v", err)
	}

	if err := store.Save(coresettings.AppSettings{Locale: "ru"}); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	settings, err := store.Get()
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}

	if settings.Locale != "ru" {
		t.Fatalf("locale = %q, want %q", settings.Locale, "ru")
	}
}
