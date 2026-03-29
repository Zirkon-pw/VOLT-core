package system

import (
	"errors"
	"fmt"
)

var (
	ErrRuntimeNotReady       = errors.New("application context is not ready")
	ErrRunIDRequired         = errors.New("run id is required")
	ErrWorkspacePathRequired = errors.New("workspace path is required")
	ErrCommandRequired       = errors.New("command is required")
)

type ErrProcessRunExists struct {
	RunID string
}

func (e *ErrProcessRunExists) Error() string {
	if e == nil || e.RunID == "" {
		return "process run id already exists"
	}

	return fmt.Sprintf("process run id %q already exists", e.RunID)
}

type ErrCommandNotFound struct {
	Command string
}

func (e *ErrCommandNotFound) Error() string {
	if e == nil || e.Command == "" {
		return "command is not installed or not available in PATH"
	}

	return fmt.Sprintf("command %q is not installed or not available in PATH", e.Command)
}
