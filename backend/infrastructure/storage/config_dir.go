package storage

import (
	"os"
	"path/filepath"
)

const appName = "volt"

// GetConfigDir returns the cross-platform configuration directory:
// - Windows: %APPDATA%\volt
// - macOS: ~/Library/Application Support/volt
// - Linux: ~/.config/volt
func GetConfigDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		// Fallback to home directory if UserConfigDir fails
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(home, ".volt"), nil
	}
	return filepath.Join(configDir, appName), nil
}
