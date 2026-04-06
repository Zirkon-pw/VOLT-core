package storage

import (
	"io"
	"log"
	"os"
	"path/filepath"
)

// GetConfigDir returns VOLT's configuration directory, using OS-idiomatic
// paths via os.UserConfigDir. On first run it silently migrates data from
// the legacy ~/.volt location if present.
//
//   - macOS:   ~/Library/Application Support/Volt
//   - Linux:   ~/.config/Volt  (or $XDG_CONFIG_HOME/Volt)
//   - Windows: %APPDATA%\Volt
func GetConfigDir() (string, error) {
	modernPath, err := getModernConfigDir()
	if err != nil {
		return getLegacyConfigDir()
	}

	if dirExists(modernPath) {
		return modernPath, nil
	}

	legacyPath, err := getLegacyConfigDir()
	if err != nil {
		return modernPath, nil
	}

	if dirExists(legacyPath) {
		if migrateErr := migrateConfig(legacyPath, modernPath); migrateErr != nil {
			log.Printf("[volt] config migration failed (%v), falling back to %s", migrateErr, legacyPath)
			return legacyPath, nil
		}
		return modernPath, nil
	}

	return modernPath, nil
}

func getModernConfigDir() (string, error) {
	cfgDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(cfgDir, "Volt"), nil
}

func getLegacyConfigDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".volt"), nil
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func migrateConfig(src, dst string) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}

	// Try atomic rename first (works on same filesystem).
	if err := os.Rename(src, dst); err == nil {
		return nil
	}

	// Fallback: recursive copy then remove.
	if err := copyDir(src, dst); err != nil {
		return err
	}
	return os.RemoveAll(src)
}

func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)

		if info.IsDir() {
			return os.MkdirAll(target, info.Mode())
		}

		return copyFile(path, target, info.Mode())
	})
}

func copyFile(src, dst string, mode os.FileMode) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, mode)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
