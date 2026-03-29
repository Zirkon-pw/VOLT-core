package commands

import (
	"context"
	"errors"
	"testing"
)

type stubCommand struct {
	name string
	run  func(ctx context.Context, req any) (any, error)
}

func (c stubCommand) Name() string {
	return c.name
}

func (c stubCommand) Execute(ctx context.Context, req any) (any, error) {
	if c.run == nil {
		return nil, nil
	}

	return c.run(ctx, req)
}

func TestManagerExecuteDispatchesRegisteredCommand(t *testing.T) {
	manager := MustNewManager(stubCommand{
		name: "test.echo",
		run: func(ctx context.Context, req any) (any, error) {
			return req, nil
		},
	})

	result, err := Execute[string](context.Background(), manager, "test.echo", "payload")
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}

	if result != "payload" {
		t.Fatalf("result = %q, want %q", result, "payload")
	}
}

func TestManagerRegisterRejectsDuplicateNames(t *testing.T) {
	manager, err := NewManager(stubCommand{name: "test.duplicate"})
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	err = manager.Register(stubCommand{name: "test.duplicate"})
	var duplicateErr *ErrDuplicateCommand
	if !errors.As(err, &duplicateErr) {
		t.Fatalf("Register() error = %v, want ErrDuplicateCommand", err)
	}
}

func TestManagerExecuteReturnsUnknownCommand(t *testing.T) {
	manager := MustNewManager()

	_, err := manager.Execute(context.Background(), "missing.command", struct{}{})
	var unknownErr *ErrUnknownCommand
	if !errors.As(err, &unknownErr) {
		t.Fatalf("Execute() error = %v, want ErrUnknownCommand", err)
	}
}

func TestManagerExecuteReturnsTypedResponse(t *testing.T) {
	type response struct {
		Value int
	}

	manager := MustNewManager(stubCommand{
		name: "test.typed",
		run: func(ctx context.Context, req any) (any, error) {
			return response{Value: 42}, nil
		},
	})

	result, err := Execute[response](context.Background(), manager, "test.typed", struct{}{})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}

	if result.Value != 42 {
		t.Fatalf("result.Value = %d, want %d", result.Value, 42)
	}
}
