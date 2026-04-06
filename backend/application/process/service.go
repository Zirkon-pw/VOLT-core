package process

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"strings"
	"sync"

	domain "volt/backend/domain/process"
)

const processEventName = "volt:plugin-process"

type Service struct {
	runtime        domain.Runtime
	processMu      sync.Mutex
	processCancels map[string]context.CancelFunc
}

func NewService(runtime domain.Runtime) *Service {
	return &Service{
		runtime:        runtime,
		processCancels: make(map[string]context.CancelFunc),
	}
}

func (s *Service) Start(req domain.StartRequest) error {
	appCtx := s.runtime.Context()
	if appCtx == nil {
		return domain.ErrRuntimeNotReady
	}

	runID := strings.TrimSpace(req.RunID)
	if runID == "" {
		return domain.ErrRunIDRequired
	}

	voltPath := strings.TrimSpace(req.VoltPath)
	if voltPath == "" {
		return domain.ErrWorkspacePathRequired
	}

	commandName := strings.TrimSpace(req.Command)
	if commandName == "" {
		return domain.ErrCommandRequired
	}

	processPath, err := exec.LookPath(commandName)
	if err != nil {
		return &domain.ErrCommandNotFound{Command: commandName}
	}

	s.processMu.Lock()
	if _, exists := s.processCancels[runID]; exists {
		s.processMu.Unlock()
		return &domain.ErrProcessRunExists{RunID: runID}
	}

	runCtx, cancel := context.WithCancel(appCtx)
	s.processCancels[runID] = cancel
	s.processMu.Unlock()

	go s.run(
		runCtx,
		cancel,
		processPath,
		runID,
		voltPath,
		req.Args,
		req.Stdin,
		normalizeProcessMode(req.StdoutMode),
		normalizeProcessMode(req.StderrMode),
		req.StartFailedMessage,
		req.StreamFailedMessage,
		req.RunFailedMessage,
	)

	return nil
}

func (s *Service) Cancel(runID string) {
	normalizedRunID := strings.TrimSpace(runID)
	if normalizedRunID == "" {
		return
	}

	cancel, ok := s.consumeProcessCancel(normalizedRunID)
	if ok {
		cancel()
	}
}

func (s *Service) run(
	runCtx context.Context,
	cancel context.CancelFunc,
	processPath string,
	runID string,
	voltPath string,
	args []string,
	stdin string,
	stdoutMode string,
	stderrMode string,
	startFailedMessage string,
	streamFailedMessage string,
	runFailedMessage string,
) {
	defer s.consumeProcessCancel(runID)

	cmd := exec.CommandContext(runCtx, processPath, args...)
	cmd.Dir = voltPath
	if stdin != "" {
		cmd.Stdin = strings.NewReader(stdin)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		s.emitEvent(domain.RuntimeEvent{RunID: runID, Type: "error", Message: startFailedMessage})
		return
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		s.emitEvent(domain.RuntimeEvent{RunID: runID, Type: "error", Message: startFailedMessage})
		return
	}

	if err := cmd.Start(); err != nil {
		s.emitEvent(domain.RuntimeEvent{RunID: runID, Type: "error", Message: startFailedMessage})
		return
	}

	streamErrors := make(chan error, 2)
	var streamWG sync.WaitGroup
	streamWG.Add(2)

	go func() {
		defer streamWG.Done()
		if streamErr := s.streamOutput(runCtx, runID, "stdout", stdout, stdoutMode); streamErr != nil {
			select {
			case streamErrors <- streamErr:
			default:
			}
			cancel()
		}
	}()

	go func() {
		defer streamWG.Done()
		if streamErr := s.streamOutput(runCtx, runID, "stderr", stderr, stderrMode); streamErr != nil {
			select {
			case streamErrors <- streamErr:
			default:
			}
			cancel()
		}
	}()

	waitErr := cmd.Wait()
	streamWG.Wait()
	close(streamErrors)

	if streamErr := firstStreamError(streamErrors); streamErr != nil {
		if !errors.Is(runCtx.Err(), context.Canceled) {
			s.runtime.LogError(s.runtime.Context(), fmt.Sprintf("plugin process %s stream failed: %v", runID, streamErr))
			s.emitEvent(domain.RuntimeEvent{RunID: runID, Type: "error", Message: streamFailedMessage})
		}
		return
	}

	if errors.Is(runCtx.Err(), context.Canceled) {
		return
	}

	if waitErr != nil {
		var exitErr *exec.ExitError
		if errors.As(waitErr, &exitErr) {
			s.emitEvent(domain.RuntimeEvent{RunID: runID, Type: "exit", Code: exitErr.ExitCode()})
			return
		}

		s.runtime.LogError(s.runtime.Context(), fmt.Sprintf("plugin process %s failed: %v", runID, waitErr))
		s.emitEvent(domain.RuntimeEvent{RunID: runID, Type: "error", Message: runFailedMessage})
		return
	}

	s.emitEvent(domain.RuntimeEvent{RunID: runID, Type: "exit", Code: 0})
}

func (s *Service) streamOutput(
	runCtx context.Context,
	runID string,
	eventType string,
	reader io.Reader,
	mode string,
) error {
	switch mode {
	case "lines":
		scanner := bufio.NewScanner(reader)
		scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
		for scanner.Scan() {
			select {
			case <-runCtx.Done():
				return nil
			default:
			}

			s.emitEvent(domain.RuntimeEvent{
				RunID: runID,
				Type:  eventType,
				Data:  scanner.Text(),
			})
		}

		if err := scanner.Err(); err != nil && !errors.Is(runCtx.Err(), context.Canceled) {
			return err
		}
		return nil
	default:
		buffer := make([]byte, 4096)
		for {
			count, err := reader.Read(buffer)
			if count > 0 {
				s.emitEvent(domain.RuntimeEvent{
					RunID: runID,
					Type:  eventType,
					Data:  string(buffer[:count]),
				})
			}

			if err != nil {
				if errors.Is(err, io.EOF) || errors.Is(runCtx.Err(), context.Canceled) {
					return nil
				}
				return err
			}
		}
	}
}

func (s *Service) emitEvent(payload domain.RuntimeEvent) {
	runtimeCtx := s.runtime.Context()
	if runtimeCtx == nil {
		return
	}

	s.runtime.EventsEmit(runtimeCtx, processEventName, payload)
}

func (s *Service) consumeProcessCancel(runID string) (context.CancelFunc, bool) {
	s.processMu.Lock()
	defer s.processMu.Unlock()

	cancel, ok := s.processCancels[runID]
	if ok {
		delete(s.processCancels, runID)
	}

	return cancel, ok
}

func normalizeProcessMode(mode string) string {
	if strings.EqualFold(strings.TrimSpace(mode), "lines") {
		return "lines"
	}

	return "raw"
}

func firstStreamError(streamErrors <-chan error) error {
	for err := range streamErrors {
		if err != nil {
			return err
		}
	}

	return nil
}
