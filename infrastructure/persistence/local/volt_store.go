package local

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"volt/core/volt"
)

const (
	configDir = ".volt"
	voltsFile = "volts.json"
)

type VoltStore struct {
	mu       sync.RWMutex
	filePath string
}

func NewVoltStore() (*VoltStore, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	dir := filepath.Join(home, configDir)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	return &VoltStore{
		filePath: filepath.Join(dir, voltsFile),
	}, nil
}

func (s *VoltStore) List() ([]volt.Volt, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.load()
}

func (s *VoltStore) GetByID(id string) (*volt.Volt, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	volts, err := s.load()
	if err != nil {
		return nil, err
	}

	for _, v := range volts {
		if v.ID == id {
			return &v, nil
		}
	}

	return nil, volt.ErrNotFound
}

func (s *VoltStore) Create(v *volt.Volt) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	volts, err := s.load()
	if err != nil {
		return err
	}

	for _, existing := range volts {
		if existing.Path == v.Path {
			return volt.ErrAlreadyExists
		}
	}

	volts = append(volts, *v)
	return s.save(volts)
}

func (s *VoltStore) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	volts, err := s.load()
	if err != nil {
		return err
	}

	found := false
	filtered := make([]volt.Volt, 0, len(volts))
	for _, v := range volts {
		if v.ID == id {
			found = true
			continue
		}
		filtered = append(filtered, v)
	}

	if !found {
		return volt.ErrNotFound
	}

	return s.save(filtered)
}

func (s *VoltStore) Save(volts []volt.Volt) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.save(volts)
}

func (s *VoltStore) load() ([]volt.Volt, error) {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return []volt.Volt{}, nil
		}
		return nil, err
	}

	var volts []volt.Volt
	if err := json.Unmarshal(data, &volts); err != nil {
		return nil, err
	}

	return volts, nil
}

func (s *VoltStore) save(volts []volt.Volt) error {
	data, err := json.MarshalIndent(volts, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.filePath, data, 0644)
}
