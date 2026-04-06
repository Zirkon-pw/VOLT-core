package filesystem

import (
	"os"
	"path/filepath"
	"sort"
	"strings"

	corefile "volt/backend/domain/file"
)

type FileRepository struct{}

func NewFileRepository() *FileRepository {
	return &FileRepository{}
}

// safePath resolves the full path and validates it stays within the provided root.
func safePath(rootPath, relativePath string) (string, error) {
	absRoot, err := filepath.Abs(rootPath)
	if err != nil {
		return "", corefile.ErrPathTraversal
	}

	full := filepath.Join(absRoot, relativePath)
	full, err = filepath.Abs(full)
	if err != nil {
		return "", corefile.ErrPathTraversal
	}

	rel, err := filepath.Rel(absRoot, full)
	if err != nil {
		return "", corefile.ErrPathTraversal
	}

	if strings.HasPrefix(rel, "..") {
		return "", corefile.ErrPathTraversal
	}

	return full, nil
}

func (r *FileRepository) Read(rootPath, path string) (string, error) {
	full, err := safePath(rootPath, path)
	if err != nil {
		return "", err
	}

	data, err := os.ReadFile(full)
	if err != nil {
		if os.IsNotExist(err) {
			return "", corefile.ErrFileNotFound
		}
		if os.IsPermission(err) {
			return "", corefile.ErrPermissionDenied
		}
		return "", err
	}

	return string(data), nil
}

func (r *FileRepository) Write(rootPath, path, content string) (err error) {
	full, err := safePath(rootPath, path)
	if err != nil {
		return err
	}

	dir := filepath.Dir(full)
	if err := os.MkdirAll(dir, 0755); err != nil {
		if os.IsPermission(err) {
			return corefile.ErrPermissionDenied
		}
		return err
	}

	if err := os.WriteFile(full, []byte(content), 0644); err != nil {
		if os.IsPermission(err) {
			return corefile.ErrPermissionDenied
		}
		return err
	}

	return nil
}

func (r *FileRepository) ListTree(rootPath, path string) ([]corefile.FileEntry, error) {
	full, err := safePath(rootPath, path)
	if err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(full)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, corefile.ErrFileNotFound
		}
		if os.IsPermission(err) {
			return nil, corefile.ErrPermissionDenied
		}
		return nil, err
	}

	absRoot, _ := filepath.Abs(rootPath)
	result := make([]corefile.FileEntry, 0, len(entries))

	for _, e := range entries {
		// Skip hidden files/directories
		if strings.HasPrefix(e.Name(), ".") {
			continue
		}

		entryFull := filepath.Join(full, e.Name())
		relPath, _ := filepath.Rel(absRoot, entryFull)

		fe := corefile.FileEntry{
			Name:  e.Name(),
			Path:  relPath,
			IsDir: e.IsDir(),
		}

		if e.IsDir() {
			children, err := r.ListTree(rootPath, relPath)
			if err != nil {
				return nil, err
			}
			fe.Children = children
		}

		result = append(result, fe)
	}

	// Sort: directories first, then alphabetically
	sort.Slice(result, func(i, j int) bool {
		if result[i].IsDir != result[j].IsDir {
			return result[i].IsDir
		}
		return strings.ToLower(result[i].Name) < strings.ToLower(result[j].Name)
	})

	return result, nil
}

func (r *FileRepository) CreateFile(rootPath, path string) error {
	full, err := safePath(rootPath, path)
	if err != nil {
		return err
	}

	if _, err := os.Stat(full); err == nil {
		return corefile.ErrAlreadyExists
	}

	dir := filepath.Dir(full)
	if err := os.MkdirAll(dir, 0755); err != nil {
		if os.IsPermission(err) {
			return corefile.ErrPermissionDenied
		}
		return err
	}

	f, err := os.Create(full)
	if err != nil {
		if os.IsPermission(err) {
			return corefile.ErrPermissionDenied
		}
		return err
	}
	return f.Close()
}

func (r *FileRepository) CreateDirectory(rootPath, path string) error {
	full, err := safePath(rootPath, path)
	if err != nil {
		return err
	}

	if _, err := os.Stat(full); err == nil {
		return corefile.ErrAlreadyExists
	}

	if err := os.MkdirAll(full, 0755); err != nil {
		if os.IsPermission(err) {
			return corefile.ErrPermissionDenied
		}
		return err
	}

	return nil
}

func (r *FileRepository) Delete(rootPath, path string) error {
	full, err := safePath(rootPath, path)
	if err != nil {
		return err
	}

	if _, err := os.Stat(full); os.IsNotExist(err) {
		return corefile.ErrFileNotFound
	}

	if err := os.RemoveAll(full); err != nil {
		if os.IsPermission(err) {
			return corefile.ErrPermissionDenied
		}
		return err
	}

	return nil
}

func (r *FileRepository) Rename(rootPath, oldPath, newPath string) error {
	fullOld, err := safePath(rootPath, oldPath)
	if err != nil {
		return err
	}

	fullNew, err := safePath(rootPath, newPath)
	if err != nil {
		return err
	}

	if _, err := os.Stat(fullOld); os.IsNotExist(err) {
		return corefile.ErrFileNotFound
	}

	if _, err := os.Stat(fullNew); err == nil {
		return corefile.ErrAlreadyExists
	}

	dir := filepath.Dir(fullNew)
	if err := os.MkdirAll(dir, 0755); err != nil {
		if os.IsPermission(err) {
			return corefile.ErrPermissionDenied
		}
		return err
	}

	if err := os.Rename(fullOld, fullNew); err != nil {
		if os.IsPermission(err) {
			return corefile.ErrPermissionDenied
		}
		return err
	}

	return nil
}
