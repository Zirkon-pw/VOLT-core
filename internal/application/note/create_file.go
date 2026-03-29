package note

import domain "volt/core/note"

type CreateFileUseCase struct {
	repo domain.Repository
}

func NewCreateFileUseCase(repo domain.Repository) *CreateFileUseCase {
	return &CreateFileUseCase{repo: repo}
}

func (uc *CreateFileUseCase) Execute(voltPath, filePath, content string) error {
	if err := uc.repo.CreateFile(voltPath, filePath); err != nil {
		return err
	}

	if content == "" {
		return nil
	}

	return uc.repo.WriteFile(voltPath, filePath, content)
}
