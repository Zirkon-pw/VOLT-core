package local

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"sync"

	coresettings "volt/core/settings"
)

const settingsFile = "settings.json"

type AppSettingsStore struct {
	mu        sync.RWMutex
	configDir string
	filePath  string
}

func NewAppSettingsStore() (*AppSettingsStore, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	configDir := filepath.Join(home, ".volt")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return nil, err
	}

	return NewAppSettingsStoreWithPath(filepath.Join(configDir, settingsFile))
}

func NewAppSettingsStoreWithPath(filePath string) (*AppSettingsStore, error) {
	configDir := filepath.Dir(filePath)
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return nil, err
	}

	return &AppSettingsStore{
		configDir: configDir,
		filePath:  filePath,
	}, nil
}

func (s *AppSettingsStore) ConfigDir() string {
	return s.configDir
}

func (s *AppSettingsStore) Get() (coresettings.AppSettings, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.load()
}

func (s *AppSettingsStore) Save(settings coresettings.AppSettings) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.save(settings)
}

func (s *AppSettingsStore) load() (coresettings.AppSettings, error) {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return coresettings.DefaultAppSettings(), nil
		}
		return coresettings.AppSettings{}, err
	}

	settings := coresettings.DefaultAppSettings()
	if err := json.Unmarshal(data, &settings); err != nil {
		log.Printf("invalid app settings at %s: %v", s.filePath, err)
		return coresettings.DefaultAppSettings(), nil
	}

	if settings.Locale == "" {
		settings.Locale = coresettings.AutoLocale
	}

	return settings, nil
}

func (s *AppSettingsStore) save(settings coresettings.AppSettings) error {
	if settings.Locale == "" {
		settings.Locale = coresettings.AutoLocale
	}

	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.filePath, data, 0644)
}
