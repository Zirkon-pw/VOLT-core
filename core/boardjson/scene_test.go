package boardjson

import (
	"strings"
	"testing"
)

func TestExtractSearchTextCollectsVisibleStrings(t *testing.T) {
	raw := `{
  "elements": [
    { "id": "1", "type": "text", "text": "Roadmap" },
    { "id": "2", "type": "text", "text": "Ship boards" },
    { "id": "3", "type": "rectangle", "customData": { "notePath": "notes/plan.md" } }
  ]
}`

	text, err := ExtractSearchText(raw)
	if err != nil {
		t.Fatalf("ExtractSearchText() error = %v", err)
	}

	if !strings.Contains(text, "Roadmap") {
		t.Fatalf("search text %q does not contain %q", text, "Roadmap")
	}

	if !strings.Contains(text, "Ship boards") {
		t.Fatalf("search text %q does not contain %q", text, "Ship boards")
	}

	if !strings.Contains(text, "notes/plan.md") {
		t.Fatalf("search text %q does not contain %q", text, "notes/plan.md")
	}
}

func TestRewriteNoteLinksUpdatesLinkAndCustomData(t *testing.T) {
	raw := `{
  "elements": [
    {
      "id": "1",
      "type": "rectangle",
      "link": "volt://note/notes%2Fold.md",
      "customData": {
        "notePath": "notes/old.md"
      }
    }
  ]
}`

	updated, changed, err := RewriteNoteLinks(raw, "notes/old.md", "notes/new.md")
	if err != nil {
		t.Fatalf("RewriteNoteLinks() error = %v", err)
	}

	if !changed {
		t.Fatalf("RewriteNoteLinks() changed = false, want true")
	}

	if !strings.Contains(updated, "volt://note/notes%2Fnew.md") {
		t.Fatalf("updated payload %q does not contain rewritten link", updated)
	}

	if !strings.Contains(updated, `"notePath": "notes/new.md"`) {
		t.Fatalf("updated payload %q does not contain rewritten notePath", updated)
	}
}

func TestRewriteNoteLinksUpdatesPathsUnderRenamedFolder(t *testing.T) {
	raw := `{
  "elements": [
    {
      "id": "1",
      "type": "rectangle",
      "link": "volt://note/projects%2Fold%2Ftask.md",
      "customData": {
        "notePath": "projects/old/task.md"
      }
    }
  ]
}`

	updated, changed, err := RewriteNoteLinks(raw, "projects/old", "projects/new")
	if err != nil {
		t.Fatalf("RewriteNoteLinks() error = %v", err)
	}

	if !changed {
		t.Fatalf("RewriteNoteLinks() changed = false, want true")
	}

	if !strings.Contains(updated, "projects/new/task.md") {
		t.Fatalf("updated payload %q does not contain rewritten folder path", updated)
	}
}
