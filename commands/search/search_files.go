package search

import (
	"bufio"
	"context"
	"os"
	"path/filepath"
	"strings"

	commandbase "volt/commands"
	"volt/core/boardjson"
	domain "volt/core/search"
)

const maxResults = 50

const SearchFilesName = "search.files"

type SearchFilesRequest struct {
	VoltPath string
	Query    string
}

type SearchFilesResponse struct {
	Results []domain.SearchResult
}

type SearchFilesCommand struct{}

func NewSearchFilesCommand() *SearchFilesCommand {
	return &SearchFilesCommand{}
}

func (c *SearchFilesCommand) Name() string {
	return SearchFilesName
}

func (c *SearchFilesCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[SearchFilesRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	if request.Query == "" {
		return SearchFilesResponse{Results: []domain.SearchResult{}}, nil
	}

	absVolt, err := filepath.Abs(request.VoltPath)
	if err != nil {
		return nil, err
	}

	queryLower := strings.ToLower(request.Query)

	var nameMatches []domain.SearchResult
	var contentMatches []domain.SearchResult

	err = filepath.Walk(absVolt, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // skip inaccessible files
		}

		// Skip hidden directories
		if info.IsDir() && strings.HasPrefix(info.Name(), ".") {
			return filepath.SkipDir
		}

		if info.IsDir() {
			return nil
		}

		fileName := info.Name()
		fileNameLower := strings.ToLower(fileName)
		isMarkdown := strings.HasSuffix(fileNameLower, ".md")
		isBoard := strings.HasSuffix(fileNameLower, ".board")
		if !isMarkdown && !isBoard {
			return nil
		}

		// Check total results limit
		if len(nameMatches)+len(contentMatches) >= maxResults {
			return filepath.SkipAll
		}

		relPath, err := filepath.Rel(absVolt, path)
		if err != nil {
			return nil
		}

		// Check file name match
		if strings.Contains(fileNameLower, queryLower) {
			nameMatches = append(nameMatches, domain.SearchResult{
				FilePath: relPath,
				FileName: fileName,
				Snippet:  "",
				Line:     0,
				IsName:   true,
			})
		}

		// Search file content
		if len(nameMatches)+len(contentMatches) < maxResults {
			results, err := searchContent(relPath, fileName, path, queryLower, isBoard)
			if err == nil && len(results) > 0 {
				remaining := maxResults - len(nameMatches) - len(contentMatches)
				if len(results) > remaining {
					results = results[:remaining]
				}
				contentMatches = append(contentMatches, results...)
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Name matches first, then content matches
	results := make([]domain.SearchResult, 0, len(nameMatches)+len(contentMatches))
	results = append(results, nameMatches...)
	results = append(results, contentMatches...)

	if len(results) > maxResults {
		results = results[:maxResults]
	}

	return SearchFilesResponse{Results: results}, nil
}

func searchContent(relPath, fileName, absPath, queryLower string, isBoard bool) ([]domain.SearchResult, error) {
	if isBoard {
		return searchBoardContent(relPath, fileName, absPath, queryLower)
	}

	return searchMarkdownContent(relPath, fileName, absPath, queryLower)
}

func searchMarkdownContent(relPath, fileName, absPath, queryLower string) ([]domain.SearchResult, error) {
	f, err := os.Open(absPath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var results []domain.SearchResult
	scanner := bufio.NewScanner(f)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := scanner.Text()
		lineLower := strings.ToLower(line)

		idx := strings.Index(lineLower, queryLower)
		if idx < 0 {
			continue
		}

		snippet := extractSnippet(line, idx, len(queryLower))
		results = append(results, domain.SearchResult{
			FilePath: relPath,
			FileName: fileName,
			Snippet:  snippet,
			Line:     lineNum,
			IsName:   false,
		})

		// Limit content matches per file to avoid flooding from a single file
		if len(results) >= 5 {
			break
		}
	}

	return results, scanner.Err()
}

func searchBoardContent(relPath, fileName, absPath, queryLower string) ([]domain.SearchResult, error) {
	raw, err := os.ReadFile(absPath)
	if err != nil {
		return nil, err
	}

	searchText, err := boardjson.ExtractSearchText(string(raw))
	if err != nil || searchText == "" {
		return nil, err
	}

	searchLower := strings.ToLower(searchText)
	idx := strings.Index(searchLower, queryLower)
	if idx < 0 {
		return nil, nil
	}

	return []domain.SearchResult{{
		FilePath: relPath,
		FileName: fileName,
		Snippet:  extractSnippet(searchText, idx, len(queryLower)),
		Line:     0,
		IsName:   false,
	}}, nil
}

func extractSnippet(line string, matchIdx, matchLen int) string {
	const contextChars = 50

	start := matchIdx - contextChars
	if start < 0 {
		start = 0
	}

	end := matchIdx + matchLen + contextChars
	if end > len(line) {
		end = len(line)
	}

	snippet := line[start:end]

	if start > 0 {
		snippet = "..." + snippet
	}
	if end < len(line) {
		snippet = snippet + "..."
	}

	return snippet
}
