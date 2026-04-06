package storage

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	domain "volt/backend/domain/storage"
)

var (
	ErrKeyNotFound = errors.New("key not found")
)

// JSONKVRepository implements a namespace-based KV store backed by JSON files.
// Each namespace maps to a separate JSON file in the config directory.
type JSONKVRepository struct {
	mu        sync.RWMutex
	configDir string
}

func NewJSONKVRepository() (*JSONKVRepository, error) {
	dir, err := GetConfigDir()
	if err != nil {
		return nil, err
	}

	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	return &JSONKVRepository{
		configDir: dir,
	}, nil
}

func (r *JSONKVRepository) ConfigDir() string {
	return r.configDir
}

func (r *JSONKVRepository) Get(namespace, key string) (json.RawMessage, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	data, err := r.loadNamespace(namespace)
	if err != nil {
		return nil, err
	}

	value, ok := data[key]
	if !ok {
		return nil, ErrKeyNotFound
	}

	return value, nil
}

func (r *JSONKVRepository) Set(namespace, key string, value json.RawMessage) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	data, err := r.loadNamespace(namespace)
	if err != nil {
		return err
	}

	data[key] = value
	return r.saveNamespace(namespace, data)
}

func (r *JSONKVRepository) Delete(namespace, key string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	data, err := r.loadNamespace(namespace)
	if err != nil {
		return err
	}

	if _, ok := data[key]; !ok {
		return ErrKeyNotFound
	}

	delete(data, key)
	return r.saveNamespace(namespace, data)
}

func (r *JSONKVRepository) List(namespace string) ([]domain.KVEntry, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	data, err := r.loadNamespace(namespace)
	if err != nil {
		return nil, err
	}

	entries := make([]domain.KVEntry, 0, len(data))
	for k, v := range data {
		entries = append(entries, domain.KVEntry{Key: k, Value: v})
	}

	return entries, nil
}

func (r *JSONKVRepository) namespaceFilePath(namespace string) string {
	return filepath.Join(r.configDir, fmt.Sprintf("%s.json", namespace))
}

func (r *JSONKVRepository) loadNamespace(namespace string) (map[string]json.RawMessage, error) {
	filePath := r.namespaceFilePath(namespace)

	raw, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return make(map[string]json.RawMessage), nil
		}
		return nil, err
	}

	var data map[string]json.RawMessage
	if err := json.Unmarshal(raw, &data); err != nil {
		return make(map[string]json.RawMessage), nil
	}

	return data, nil
}

func (r *JSONKVRepository) saveNamespace(namespace string, data map[string]json.RawMessage) error {
	filePath := r.namespaceFilePath(namespace)

	raw, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filePath, raw, 0644)
}
