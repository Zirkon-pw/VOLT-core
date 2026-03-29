package boardjson

import (
	"encoding/json"
	"net/url"
	"strings"
)

const noteLinkPrefix = "volt://note/"

var searchableFields = map[string]struct{}{
	"text":         {},
	"originalText": {},
	"notePath":     {},
}

func ExtractSearchText(raw string) (string, error) {
	var payload map[string]any
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return "", err
	}

	elements, _ := payload["elements"].([]any)
	if len(elements) == 0 {
		return "", nil
	}

	seen := make(map[string]struct{})
	parts := make([]string, 0, len(elements))
	for _, element := range elements {
		collectSearchStrings(element, "", seen, &parts)
	}

	return strings.Join(parts, "\n"), nil
}

func RewriteNoteLinks(raw string, oldPath, newPath string) (string, bool, error) {
	var payload map[string]any
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return "", false, err
	}

	elements, _ := payload["elements"].([]any)
	if len(elements) == 0 {
		return raw, false, nil
	}

	changed := false
	for _, element := range elements {
		if rewriteElementLinks(element, oldPath, newPath) {
			changed = true
		}
	}

	if !changed {
		return raw, false, nil
	}

	encoded, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return "", false, err
	}

	return string(encoded), true, nil
}

func collectSearchStrings(value any, parentKey string, seen map[string]struct{}, parts *[]string) {
	switch typed := value.(type) {
	case map[string]any:
		for key, child := range typed {
			collectSearchStrings(child, key, seen, parts)
		}
	case []any:
		for _, child := range typed {
			collectSearchStrings(child, parentKey, seen, parts)
		}
	case string:
		if _, ok := searchableFields[parentKey]; !ok {
			return
		}

		trimmed := strings.TrimSpace(typed)
		if trimmed == "" {
			return
		}
		if _, exists := seen[trimmed]; exists {
			return
		}

		seen[trimmed] = struct{}{}
		*parts = append(*parts, trimmed)
	}
}

func rewriteElementLinks(value any, oldPath, newPath string) bool {
	element, ok := value.(map[string]any)
	if !ok {
		return false
	}

	changed := false

	if linkValue, ok := element["link"].(string); ok {
		if rewritten, didChange := rewriteVoltNoteLink(linkValue, oldPath, newPath); didChange {
			element["link"] = rewritten
			changed = true
		}
	}

	if customData, ok := element["customData"].(map[string]any); ok {
		if notePath, ok := customData["notePath"].(string); ok {
			if rewritten, didChange := rewriteTargetPath(notePath, oldPath, newPath); didChange {
				customData["notePath"] = rewritten
				changed = true
			}
		}
	}

	return changed
}

func rewriteVoltNoteLink(linkValue, oldPath, newPath string) (string, bool) {
	if !strings.HasPrefix(linkValue, noteLinkPrefix) {
		return linkValue, false
	}

	decodedPath, err := url.PathUnescape(strings.TrimPrefix(linkValue, noteLinkPrefix))
	if err != nil {
		return linkValue, false
	}

	rewrittenPath, changed := rewriteTargetPath(decodedPath, oldPath, newPath)
	if !changed {
		return linkValue, false
	}

	return noteLinkPrefix + url.PathEscape(rewrittenPath), true
}

func rewriteTargetPath(pathValue, oldPath, newPath string) (string, bool) {
	switch {
	case pathValue == oldPath:
		return newPath, true
	case strings.HasPrefix(pathValue, oldPath+"/"):
		return newPath + pathValue[len(oldPath):], true
	default:
		return pathValue, false
	}
}
