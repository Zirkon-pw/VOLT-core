package wailshandler

import (
	"context"

	domain "volt/core/note"
	appnote "volt/internal/application/note"
	appsettings "volt/internal/application/settings"
)

type NoteHandler struct {
	ctx             context.Context
	readNote        *appnote.ReadNoteUseCase
	saveNote        *appnote.SaveNoteUseCase
	listTree        *appnote.ListTreeUseCase
	createNote      *appnote.CreateNoteUseCase
	createFile      *appnote.CreateFileUseCase
	createDirectory *appnote.CreateDirectoryUseCase
	deleteNote      *appnote.DeleteNoteUseCase
	renameNote      *appnote.RenameNoteUseCase
	localization    *appsettings.LocalizationService
}

func NewNoteHandler(
	readNote *appnote.ReadNoteUseCase,
	saveNote *appnote.SaveNoteUseCase,
	listTree *appnote.ListTreeUseCase,
	createNote *appnote.CreateNoteUseCase,
	createFile *appnote.CreateFileUseCase,
	createDirectory *appnote.CreateDirectoryUseCase,
	deleteNote *appnote.DeleteNoteUseCase,
	renameNote *appnote.RenameNoteUseCase,
	localization *appsettings.LocalizationService,
) *NoteHandler {
	return &NoteHandler{
		readNote:        readNote,
		saveNote:        saveNote,
		listTree:        listTree,
		createNote:      createNote,
		createFile:      createFile,
		createDirectory: createDirectory,
		deleteNote:      deleteNote,
		renameNote:      renameNote,
		localization:    localization,
	}
}

func (h *NoteHandler) SetContext(ctx context.Context) {
	h.ctx = ctx
}

func (h *NoteHandler) ReadNote(voltPath, filePath string) (string, error) {
	result, err := h.readNote.Execute(voltPath, filePath)
	if err != nil {
		return "", localizedNoteError(h.localization, "backend.action.readNote", quotedPathParam(filePath), err)
	}
	return result, nil
}

func (h *NoteHandler) SaveNote(voltPath, filePath, content string) error {
	if err := h.saveNote.Execute(voltPath, filePath, content); err != nil {
		return localizedNoteError(h.localization, "backend.action.saveNote", quotedPathParam(filePath), err)
	}
	return nil
}

func (h *NoteHandler) ListTree(voltPath, dirPath string) ([]domain.FileEntry, error) {
	result, err := h.listTree.Execute(voltPath, dirPath)
	if err != nil {
		return nil, localizedNoteError(h.localization, "backend.action.listTree", quotedPathParam(dirPath), err)
	}
	return result, nil
}

func (h *NoteHandler) CreateNote(voltPath, filePath string) error {
	if err := h.createNote.Execute(voltPath, filePath); err != nil {
		return localizedNoteError(h.localization, "backend.action.createNote", quotedPathParam(filePath), err)
	}
	return nil
}

func (h *NoteHandler) CreateFile(voltPath, filePath, content string) error {
	if err := h.createFile.Execute(voltPath, filePath, content); err != nil {
		return localizedNoteError(h.localization, "backend.action.createFile", quotedPathParam(filePath), err)
	}
	return nil
}

func (h *NoteHandler) CreateDirectory(voltPath, dirPath string) error {
	if err := h.createDirectory.Execute(voltPath, dirPath); err != nil {
		return localizedNoteError(h.localization, "backend.action.createDirectory", quotedPathParam(dirPath), err)
	}
	return nil
}

func (h *NoteHandler) DeleteNote(voltPath, filePath string) error {
	if err := h.deleteNote.Execute(voltPath, filePath); err != nil {
		return localizedNoteError(h.localization, "backend.action.deleteNote", quotedPathParam(filePath), err)
	}
	return nil
}

func (h *NoteHandler) RenameNote(voltPath, oldPath, newPath string) error {
	if err := h.renameNote.Execute(voltPath, oldPath, newPath); err != nil {
		return localizedNoteError(h.localization, "backend.action.renameNote", renameParams(oldPath, newPath), err)
	}
	return nil
}
