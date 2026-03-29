package wailshandler

import (
	"context"

	commandbase "volt/commands"
	commandnote "volt/commands/note"
	domain "volt/core/note"
	coresettings "volt/core/settings"
)

type NoteHandler struct {
	manager      *commandbase.Manager
	localization *coresettings.LocalizationService
}

func NewNoteHandler(
	manager *commandbase.Manager,
	localization *coresettings.LocalizationService,
) *NoteHandler {
	return &NoteHandler{
		manager:      manager,
		localization: localization,
	}
}

func (h *NoteHandler) ReadNote(voltPath, filePath string) (string, error) {
	result, err := commandbase.Execute[commandnote.ReadResponse](
		context.Background(),
		h.manager,
		commandnote.ReadName,
		commandnote.ReadRequest{VoltPath: voltPath, FilePath: filePath},
	)
	if err != nil {
		return "", localizedNoteError(h.localization, "backend.action.readNote", quotedPathParam(filePath), err)
	}
	return result.Content, nil
}

func (h *NoteHandler) SaveNote(voltPath, filePath, content string) error {
	_, err := commandbase.Execute[commandnote.SaveResponse](
		context.Background(),
		h.manager,
		commandnote.SaveName,
		commandnote.SaveRequest{VoltPath: voltPath, FilePath: filePath, Content: content},
	)
	if err != nil {
		return localizedNoteError(h.localization, "backend.action.saveNote", quotedPathParam(filePath), err)
	}
	return nil
}

func (h *NoteHandler) ListTree(voltPath, dirPath string) ([]domain.FileEntry, error) {
	result, err := commandbase.Execute[commandnote.ListTreeResponse](
		context.Background(),
		h.manager,
		commandnote.ListTreeName,
		commandnote.ListTreeRequest{VoltPath: voltPath, DirPath: dirPath},
	)
	if err != nil {
		return nil, localizedNoteError(h.localization, "backend.action.listTree", quotedPathParam(dirPath), err)
	}
	return result.Entries, nil
}

func (h *NoteHandler) CreateNote(voltPath, filePath string) error {
	_, err := commandbase.Execute[commandnote.CreateNoteResponse](
		context.Background(),
		h.manager,
		commandnote.CreateNoteName,
		commandnote.CreateNoteRequest{VoltPath: voltPath, FilePath: filePath},
	)
	if err != nil {
		return localizedNoteError(h.localization, "backend.action.createNote", quotedPathParam(filePath), err)
	}
	return nil
}

func (h *NoteHandler) CreateFile(voltPath, filePath, content string) error {
	_, err := commandbase.Execute[commandnote.CreateFileResponse](
		context.Background(),
		h.manager,
		commandnote.CreateFileName,
		commandnote.CreateFileRequest{VoltPath: voltPath, FilePath: filePath, Content: content},
	)
	if err != nil {
		return localizedNoteError(h.localization, "backend.action.createFile", quotedPathParam(filePath), err)
	}
	return nil
}

func (h *NoteHandler) CreateDirectory(voltPath, dirPath string) error {
	_, err := commandbase.Execute[commandnote.CreateDirectoryResponse](
		context.Background(),
		h.manager,
		commandnote.CreateDirectoryName,
		commandnote.CreateDirectoryRequest{VoltPath: voltPath, DirPath: dirPath},
	)
	if err != nil {
		return localizedNoteError(h.localization, "backend.action.createDirectory", quotedPathParam(dirPath), err)
	}
	return nil
}

func (h *NoteHandler) DeleteNote(voltPath, filePath string) error {
	_, err := commandbase.Execute[commandnote.DeleteResponse](
		context.Background(),
		h.manager,
		commandnote.DeleteName,
		commandnote.DeleteRequest{VoltPath: voltPath, FilePath: filePath},
	)
	if err != nil {
		return localizedNoteError(h.localization, "backend.action.deleteNote", quotedPathParam(filePath), err)
	}
	return nil
}

func (h *NoteHandler) RenameNote(voltPath, oldPath, newPath string) error {
	_, err := commandbase.Execute[commandnote.RenameResponse](
		context.Background(),
		h.manager,
		commandnote.RenameName,
		commandnote.RenameRequest{VoltPath: voltPath, OldPath: oldPath, NewPath: newPath},
	)
	if err != nil {
		return localizedNoteError(h.localization, "backend.action.renameNote", renameParams(oldPath, newPath), err)
	}
	return nil
}
