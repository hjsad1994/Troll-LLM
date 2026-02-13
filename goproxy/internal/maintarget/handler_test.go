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

func TestHandleNonStreamResponseWithPrefixAndModel_RewritesAnthropicModel(t *testing.T) {
	body := `{"id":"msg_1","type":"message","model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":9,"output_tokens":4}}`
	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(body))}

	rr := httptest.NewRecorder()
	var gotInput int64
	var gotOutput int64

	HandleNonStreamResponseWithPrefixAndModel(rr, resp, func(input, output, _, _ int64) {
		gotInput = input
		gotOutput = output
	}, "OpenHands", "claude-opus-4-5-20251101")

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &parsed); err != nil {
		t.Fatalf("expected valid JSON response, got error: %v", err)
	}

	if parsed["model"] != "claude-opus-4-5-20251101" {
		t.Fatalf("expected rewritten model, got %v", parsed["model"])
	}

	if gotInput != 9 || gotOutput != 4 {
		t.Fatalf("expected usage callback with in=9 out=4, got in=%d out=%d", gotInput, gotOutput)
	}
}

func TestHandleStreamResponseWithPrefixAndModel_RewritesAnthropicMessageStartModel(t *testing.T) {
	streamBody := strings.Join([]string{
		`event: message_start`,
		`data: {"type":"message_start","message":{"id":"msg_1","model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":12}}}`,
		`event: message_delta`,
		`data: {"type":"message_delta","usage":{"output_tokens":6}}`,
		`event: message_stop`,
		`data: {"type":"message_stop"}`,
	}, "\n") + "\n"

	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(streamBody))}
	rr := httptest.NewRecorder()

	var gotInput int64
	var gotOutput int64

	HandleStreamResponseWithPrefixAndModel(rr, resp, func(input, output, _, _ int64) {
		gotInput = input
		gotOutput = output
	}, "OpenHands", "claude-opus-4-5-20251101")

	output := rr.Body.String()
	if !strings.Contains(output, `"model":"claude-opus-4-5-20251101"`) {
		t.Fatalf("expected rewritten anthropic model in stream output, got: %s", output)
	}

	if strings.Contains(output, `"model":"claude-sonnet-4-5-20250929"`) {
		t.Fatalf("expected upstream anthropic model to be hidden, got: %s", output)
	}

	if gotInput != 12 || gotOutput != 6 {
		t.Fatalf("expected usage callback with in=12 out=6, got in=%d out=%d", gotInput, gotOutput)
	}
}

func TestMask_AnthropicResponses_RewritesForAllConfiguredOpenHandsModels(t *testing.T) {
	requestedModels := []string{
		"claude-opus-4-6",
		"claude-opus-4-5-20251101",
		"claude-sonnet-4-5-20250929",
		"claude-sonnet-4-5",
		"claude-haiku-4-5-20251001",
		"claude-haiku-4-5",
	}

	for _, requestedModel := range requestedModels {
		t.Run(requestedModel, func(t *testing.T) {
			nonStreamBody := `{"id":"msg_1","type":"message","model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":7,"output_tokens":3}}`
			nonStreamResp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(nonStreamBody))}
			nonStreamWriter := httptest.NewRecorder()

			HandleNonStreamResponseWithPrefixAndModel(nonStreamWriter, nonStreamResp, nil, "OpenHands", requestedModel)

			var parsed map[string]interface{}
			if err := json.Unmarshal(nonStreamWriter.Body.Bytes(), &parsed); err != nil {
				t.Fatalf("expected valid non-stream JSON, got error: %v", err)
			}

			if parsed["model"] != requestedModel {
				t.Fatalf("expected non-stream model %q, got %v", requestedModel, parsed["model"])
			}

			streamBody := strings.Join([]string{
				`event: message_start`,
				`data: {"type":"message_start","message":{"id":"msg_1","model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":10}}}`,
				`event: message_delta`,
				`data: {"type":"message_delta","usage":{"output_tokens":5}}`,
			}, "\n") + "\n"

			streamResp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(streamBody))}
			streamWriter := httptest.NewRecorder()

			HandleStreamResponseWithPrefixAndModel(streamWriter, streamResp, nil, "OpenHands", requestedModel)

			output := streamWriter.Body.String()
			if !strings.Contains(output, `"model":"`+requestedModel+`"`) {
				t.Fatalf("expected stream model %q in output, got: %s", requestedModel, output)
			}

			if requestedModel != "claude-sonnet-4-5-20250929" && strings.Contains(output, `"model":"claude-sonnet-4-5-20250929"`) {
				t.Fatalf("expected upstream model hidden in stream output, got: %s", output)
			}
		})
	}
}
