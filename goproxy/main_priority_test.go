package main

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func withRoleLookup(t *testing.T, lookup func(username string) (string, error)) {
	t.Helper()
	old := getUserRoleForPriority
	getUserRoleForPriority = lookup
	t.Cleanup(func() {
		getUserRoleForPriority = old
	})
}

func withModelsUsernameResolver(t *testing.T, resolver func(clientAPIKey string) (string, error)) {
	t.Helper()
	old := resolveUsernameForModelsForPriority
	resolveUsernameForModelsForPriority = resolver
	t.Cleanup(func() {
		resolveUsernameForModelsForPriority = old
	})
}

func TestShouldEnforcePriorityAccess(t *testing.T) {
	tests := []struct {
		name           string
		host           string
		configuredPort int
		expected       bool
	}{
		{"priority service port always enforced", "chat.trollllm.xyz", 8006, true},
		{"priority service port with empty host", "", 8006, true},
		{"priority host trolllm enforced", "chat-priority.trolllm.xyz", 8004, true},
		{"priority host trollllm alias enforced", "chat-priority.trollllm.xyz", 8004, true},
		{"regular host not enforced on non-priority port", "chat.trollllm.xyz", 8004, false},
		{"host with port is normalized", "chat-priority.trolllm.xyz:443", 8004, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := shouldEnforcePriorityAccess(tt.host, tt.configuredPort); got != tt.expected {
				t.Fatalf("shouldEnforcePriorityAccess(%q, %d) = %v, want %v", tt.host, tt.configuredPort, got, tt.expected)
			}
		})
	}
}

func TestModelsHandler_PriorityHostWithProxyKeyDenied(t *testing.T) {
	t.Setenv("PROXY_API_KEY", "sk-test-proxy")

	req := httptest.NewRequest(http.MethodGet, "/v1/models", nil)
	req.Host = "chat-priority.trolllm.xyz"
	req.Header.Set("Authorization", "Bearer sk-test-proxy")

	rr := httptest.NewRecorder()
	modelsHandler(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d", http.StatusForbidden, rr.Code)
	}

	if !strings.Contains(rr.Body.String(), priorityLineDeniedMessage) {
		t.Fatalf("expected deny message %q in response body, got %s", priorityLineDeniedMessage, rr.Body.String())
	}
}

func TestChatCompletionsHandler_PriorityHostWithProxyKeyDenied(t *testing.T) {
	t.Setenv("PROXY_API_KEY", "sk-test-proxy")

	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{}`))
	req.Host = "chat-priority.trolllm.xyz"
	req.Header.Set("Authorization", "Bearer sk-test-proxy")

	rr := httptest.NewRecorder()
	chatCompletionsHandler(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d", http.StatusForbidden, rr.Code)
	}

	if !strings.Contains(rr.Body.String(), priorityLineDeniedMessage) {
		t.Fatalf("expected deny message %q in response body, got %s", priorityLineDeniedMessage, rr.Body.String())
	}
}

func TestMessagesHandler_PriorityHostWithProxyKeyDenied(t *testing.T) {
	t.Setenv("PROXY_API_KEY", "sk-test-proxy")

	req := httptest.NewRequest(http.MethodPost, "/v1/messages", strings.NewReader(`{}`))
	req.Host = "chat-priority.trolllm.xyz"
	req.Header.Set("x-api-key", "sk-test-proxy")

	rr := httptest.NewRecorder()
	handleAnthropicMessagesEndpoint(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d", http.StatusForbidden, rr.Code)
	}

	if !strings.Contains(rr.Body.String(), priorityLineDeniedMessage) {
		t.Fatalf("expected deny message %q in response body, got %s", priorityLineDeniedMessage, rr.Body.String())
	}
}

func TestModelsHandler_RegularHostNotBlockedByPriorityGate(t *testing.T) {
	t.Setenv("PROXY_API_KEY", "sk-test-proxy")

	req := httptest.NewRequest(http.MethodGet, "/v1/models", nil)
	req.Host = "chat.trollllm.xyz"
	req.Header.Set("Authorization", "Bearer sk-test-proxy")

	rr := httptest.NewRecorder()
	modelsHandler(rr, req)

	if rr.Code == http.StatusForbidden && strings.Contains(rr.Body.String(), priorityLineDeniedMessage) {
		t.Fatalf("regular host must not be blocked by priority gate; body=%s", rr.Body.String())
	}

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d for regular host models endpoint, got %d body=%s", http.StatusOK, rr.Code, rr.Body.String())
	}
}

func TestModelsHandler_PriorityHostAllowsAdminAndPriorityRoles(t *testing.T) {
	withModelsUsernameResolver(t, func(clientAPIKey string) (string, error) {
		return "alice", nil
	})

	tests := []struct {
		name string
		role string
	}{
		{"admin role allowed", "admin"},
		{"priority role allowed", "priority"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			withRoleLookup(t, func(username string) (string, error) {
				return tt.role, nil
			})

			req := httptest.NewRequest(http.MethodGet, "/v1/models", nil)
			req.Host = "chat-priority.trolllm.xyz"
			req.Header.Set("Authorization", "Bearer sk-any")

			rr := httptest.NewRecorder()
			modelsHandler(rr, req)

			if rr.Code != http.StatusOK {
				t.Fatalf("expected status %d, got %d body=%s", http.StatusOK, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestModelsHandler_PriorityHostDeniesNonPriorityRoles(t *testing.T) {
	withModelsUsernameResolver(t, func(clientAPIKey string) (string, error) {
		return "bob", nil
	})

	tests := []struct {
		name string
		role string
	}{
		{"user role denied", "user"},
		{"unknown role denied", "guest"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			withRoleLookup(t, func(username string) (string, error) {
				return tt.role, nil
			})

			req := httptest.NewRequest(http.MethodGet, "/v1/models", nil)
			req.Host = "chat-priority.trolllm.xyz"
			req.Header.Set("Authorization", "Bearer sk-any")

			rr := httptest.NewRecorder()
			modelsHandler(rr, req)

			if rr.Code != http.StatusForbidden {
				t.Fatalf("expected status %d, got %d body=%s", http.StatusForbidden, rr.Code, rr.Body.String())
			}

			if !strings.Contains(rr.Body.String(), priorityLineDeniedMessage) {
				t.Fatalf("expected deny message %q in response body, got %s", priorityLineDeniedMessage, rr.Body.String())
			}
		})
	}
}

func TestModelsHandler_PriorityHostDeniesWhenRoleLookupFails(t *testing.T) {
	withModelsUsernameResolver(t, func(clientAPIKey string) (string, error) {
		return "bob", nil
	})
	withRoleLookup(t, func(username string) (string, error) {
		return "", errors.New("lookup failed")
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/models", nil)
	req.Host = "chat-priority.trolllm.xyz"
	req.Header.Set("Authorization", "Bearer sk-any")

	rr := httptest.NewRecorder()
	modelsHandler(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusForbidden, rr.Code, rr.Body.String())
	}
}

func TestEnforcePriorityLineAccess_RoleMatrix(t *testing.T) {
	tests := []struct {
		name      string
		role      string
		anthropic bool
		allowed   bool
	}{
		{"admin allowed for openai", "admin", false, true},
		{"priority allowed for anthropic", "priority", true, true},
		{"user denied for openai", "user", false, false},
		{"guest denied for anthropic", "guest", true, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			withRoleLookup(t, func(username string) (string, error) {
				return tt.role, nil
			})

			req := httptest.NewRequest(http.MethodGet, "/v1/models", nil)
			req.Host = "chat-priority.trolllm.xyz"
			rr := httptest.NewRecorder()

			allowed := enforcePriorityLineAccess(rr, req, "alice", "sk-test", tt.anthropic)
			if allowed != tt.allowed {
				t.Fatalf("expected allowed=%v, got %v", tt.allowed, allowed)
			}

			if tt.allowed {
				if rr.Code != http.StatusOK {
					t.Fatalf("expected default status %d for allowed access, got %d", http.StatusOK, rr.Code)
				}
				return
			}

			if rr.Code != http.StatusForbidden {
				t.Fatalf("expected status %d, got %d body=%s", http.StatusForbidden, rr.Code, rr.Body.String())
			}

			if !strings.Contains(rr.Body.String(), priorityLineDeniedMessage) {
				t.Fatalf("expected deny message %q in response body, got %s", priorityLineDeniedMessage, rr.Body.String())
			}
		})
	}
}
