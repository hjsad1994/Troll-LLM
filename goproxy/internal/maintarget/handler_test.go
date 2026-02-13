package maintarget

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandleOpenAINonStreamResponse_RewritesModel(t *testing.T) {
	body := `{"id":"chatcmpl-1","model":"zai-org/GLM-5-FP8","choices":[],"usage":{"prompt_tokens":11,"completion_tokens":7}}`
	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(body))}

	rr := httptest.NewRecorder()
	var gotInput int64
	var gotOutput int64

	HandleOpenAINonStreamResponse(rr, resp, "claude-sonnet-4-5-20250929", func(input, output, _, _ int64) {
		gotInput = input
		gotOutput = output
	})

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &parsed); err != nil {
		t.Fatalf("expected valid JSON response, got error: %v", err)
	}

	if parsed["model"] != "claude-sonnet-4-5-20250929" {
		t.Fatalf("expected rewritten model, got %v", parsed["model"])
	}

	if gotInput != 11 || gotOutput != 7 {
		t.Fatalf("expected usage callback with in=11 out=7, got in=%d out=%d", gotInput, gotOutput)
	}
}

func TestHandleOpenAINonStreamResponse_FallbackOnInvalidJSON(t *testing.T) {
	body := `not-json`
	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(body))}

	rr := httptest.NewRecorder()
	HandleOpenAINonStreamResponse(rr, resp, "claude-sonnet-4-5-20250929", nil)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	if strings.TrimSpace(rr.Body.String()) != body {
		t.Fatalf("expected original body passthrough, got %q", rr.Body.String())
	}
}

func TestHandleOpenAIStreamResponse_RewritesModel(t *testing.T) {
	streamBody := strings.Join([]string{
		`data: {"id":"chatcmpl-1","model":"zai-org/GLM-5-FP8","choices":[{"delta":{"content":"Hi"}}]}`,
		`data: {"id":"chatcmpl-1","model":"zai-org/GLM-5-FP8","usage":{"prompt_tokens":5,"completion_tokens":2},"choices":[{"delta":{"content":"!"}}]}`,
		`data: [DONE]`,
	}, "\n") + "\n"

	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(streamBody))}
	rr := httptest.NewRecorder()

	var gotInput int64
	var gotOutput int64

	HandleOpenAIStreamResponse(rr, resp, "claude-sonnet-4-5-20250929", func(input, output, _, _ int64) {
		gotInput = input
		gotOutput = output
	})

	output := rr.Body.String()
	if !strings.Contains(output, `"model":"claude-sonnet-4-5-20250929"`) {
		t.Fatalf("expected rewritten model in stream output, got: %s", output)
	}

	if strings.Contains(output, `"model":"zai-org/GLM-5-FP8"`) {
		t.Fatalf("expected upstream model to be hidden, got: %s", output)
	}

	if !strings.Contains(output, "data: [DONE]") {
		t.Fatalf("expected [DONE] passthrough, got: %s", output)
	}

	if gotInput != 5 || gotOutput != 2 {
		t.Fatalf("expected usage callback with in=5 out=2, got in=%d out=%d", gotInput, gotOutput)
	}
}

func TestHandleOpenAIStreamResponse_FallbackOnInvalidJSONLine(t *testing.T) {
	streamBody := strings.Join([]string{
		`data: {not-json}`,
		`data: [DONE]`,
	}, "\n") + "\n"

	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(streamBody))}
	rr := httptest.NewRecorder()

	HandleOpenAIStreamResponse(rr, resp, "claude-sonnet-4-5-20250929", nil)

	output := rr.Body.String()
	if !strings.Contains(output, "data: {not-json}") {
		t.Fatalf("expected invalid JSON line passthrough, got: %s", output)
	}
}
