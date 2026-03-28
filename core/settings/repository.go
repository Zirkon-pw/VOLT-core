package settings

type Repository interface {
	Get() (AppSettings, error)
	Save(settings AppSettings) error
}
