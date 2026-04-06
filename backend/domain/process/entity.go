package process

type StartRequest struct {
	RunID               string
	VoltPath            string
	Command             string
	Args                []string
	Stdin               string
	StdoutMode          string
	StderrMode          string
	StartFailedMessage  string
	StreamFailedMessage string
	RunFailedMessage    string
}

type RuntimeEvent struct {
	RunID   string `json:"runId"`
	Type    string `json:"type"`
	Data    string `json:"data,omitempty"`
	Code    int    `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
}
