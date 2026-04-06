package storage

import "encoding/json"

// KVEntry represents a key-value pair in a namespace.
type KVEntry struct {
	Key   string          `json:"key"`
	Value json.RawMessage `json:"value"`
}
