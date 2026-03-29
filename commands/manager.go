package commands

import (
	"context"
	"errors"
	"fmt"
	"sync"
)

var ErrManagerIsNil = errors.New("command manager is nil")

type ErrUnknownCommand struct {
	Name string
}

func (e *ErrUnknownCommand) Error() string {
	if e == nil || e.Name == "" {
		return "command is not registered"
	}

	return fmt.Sprintf("command %q is not registered", e.Name)
}

type ErrDuplicateCommand struct {
	Name string
}

func (e *ErrDuplicateCommand) Error() string {
	if e == nil || e.Name == "" {
		return "command is already registered"
	}

	return fmt.Sprintf("command %q is already registered", e.Name)
}

type Command interface {
	Name() string
	Execute(ctx context.Context, req any) (any, error)
}

type Manager struct {
	mu       sync.RWMutex
	commands map[string]Command
}

func NewManager(commands ...Command) (*Manager, error) {
	manager := &Manager{
		commands: make(map[string]Command, len(commands)),
	}

	for _, command := range commands {
		if err := manager.Register(command); err != nil {
			return nil, err
		}
	}

	return manager, nil
}

func MustNewManager(commands ...Command) *Manager {
	manager, err := NewManager(commands...)
	if err != nil {
		panic(err)
	}

	return manager
}

func (m *Manager) Register(command Command) error {
	if m == nil {
		return ErrManagerIsNil
	}

	if command == nil {
		return errors.New("command is nil")
	}

	name := command.Name()
	if name == "" {
		return errors.New("command name is empty")
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.commands[name]; exists {
		return &ErrDuplicateCommand{Name: name}
	}

	m.commands[name] = command
	return nil
}

func (m *Manager) Execute(ctx context.Context, name string, req any) (any, error) {
	if m == nil {
		return nil, ErrManagerIsNil
	}

	m.mu.RLock()
	command, ok := m.commands[name]
	m.mu.RUnlock()
	if !ok {
		return nil, &ErrUnknownCommand{Name: name}
	}

	if ctx == nil {
		ctx = context.Background()
	}

	return command.Execute(ctx, req)
}

func Execute[T any](ctx context.Context, manager *Manager, name string, req any) (T, error) {
	var zero T

	result, err := manager.Execute(ctx, name, req)
	if err != nil {
		return zero, err
	}

	if result == nil {
		return zero, nil
	}

	typed, ok := result.(T)
	if ok {
		return typed, nil
	}

	return zero, fmt.Errorf("command %q returned %T", name, result)
}

func Decode[T any](name string, req any) (T, error) {
	var zero T

	typed, ok := req.(T)
	if ok {
		return typed, nil
	}

	return zero, fmt.Errorf("invalid request for %q: %T", name, req)
}
