package userkey

import "testing"

func TestGetKeyType(t *testing.T) {
	tests := []struct {
		name     string
		apiKey   string
		expected KeyType
	}{
		// User Key tests - sk-troll-* prefix
		{
			name:     "User key with sk-troll prefix",
			apiKey:   "sk-troll-abc123def456",
			expected: KeyTypeUser,
		},
		{
			name:     "User key with sk-trollllm prefix",
			apiKey:   "sk-trollllm-abc123def456",
			expected: KeyTypeUser,
		},
		{
			name:     "User key with full sk-trollllm format",
			apiKey:   "sk-trollllm-user-12345",
			expected: KeyTypeUser,
		},

		// Friend Key tests - sk-trollllm-friend-* prefix
		{
			name:     "Friend key with sk-trollllm-friend prefix",
			apiKey:   "sk-trollllm-friend-abc123",
			expected: KeyTypeFriend,
		},
		{
			name:     "Friend key with longer suffix",
			apiKey:   "sk-trollllm-friend-owner-xyz-123456",
			expected: KeyTypeFriend,
		},

		// Unknown key tests
		{
			name:     "Unknown key with different prefix",
			apiKey:   "sk-other-abc123",
			expected: KeyTypeUnknown,
		},
		{
			name:     "Empty key",
			apiKey:   "",
			expected: KeyTypeUnknown,
		},
		{
			name:     "Random string",
			apiKey:   "random-api-key-123",
			expected: KeyTypeUnknown,
		},
		{
			name:     "Partial prefix sk-trol (missing l)",
			apiKey:   "sk-tro-abc123",
			expected: KeyTypeUnknown,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GetKeyType(tt.apiKey)
			if got != tt.expected {
				t.Errorf("GetKeyType(%q) = %v, want %v", tt.apiKey, got, tt.expected)
			}
		})
	}
}

func TestKeyTypeString(t *testing.T) {
	tests := []struct {
		keyType  KeyType
		expected string
	}{
		{KeyTypeUser, "user"},
		{KeyTypeFriend, "friend"},
		{KeyTypeUnknown, "unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			if got := tt.keyType.String(); got != tt.expected {
				t.Errorf("KeyType.String() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func BenchmarkGetKeyType(b *testing.B) {
	testKeys := []string{
		"sk-troll-abc123def456",
		"sk-trollllm-friend-owner-xyz",
		"sk-other-unknown",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		for _, key := range testKeys {
			GetKeyType(key)
		}
	}
}
