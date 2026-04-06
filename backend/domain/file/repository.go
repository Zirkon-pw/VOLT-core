package file

type Repository interface {
	Read(rootPath, path string) (string, error)
	Write(rootPath, path, content string) error
	ListTree(rootPath, path string) ([]FileEntry, error)
	CreateFile(rootPath, path string) error
	CreateDirectory(rootPath, path string) error
	Delete(rootPath, path string) error
	Rename(rootPath, oldPath, newPath string) error
}
