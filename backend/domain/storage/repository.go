package storage

import "encoding/json"

type Repository interface {
	Get(namespace, key string) (json.RawMessage, error)
	Set(namespace, key string, value json.RawMessage) error
	Delete(namespace, key string) error
	List(namespace string) ([]KVEntry, error)
}
