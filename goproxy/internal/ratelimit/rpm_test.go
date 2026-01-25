package ratelimit

import (
	"testing"

	"goproxy/internal/userkey"
)

func TestGetRPMForKeyType(t *testing.T) {
	tests := []struct {
		name     string
		keyType  userkey.KeyType
		expected int
	}{
		{
			name:     "User key gets 2000 RPM",
			keyType:  userkey.KeyTypeUser,
			expected: UserKeyRPM,
		},
		{
			name:     "Friend key gets 60 RPM",
			keyType:  userkey.KeyTypeFriend,
			expected: FriendKeyRPM,
		},
		{
			name:     "Unknown key gets default RPM",
			keyType:  userkey.KeyTypeUnknown,
			expected: DefaultRPM,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GetRPMForKeyType(tt.keyType)
			if got != tt.expected {
				t.Errorf("GetRPMForKeyType(%v) = %d, want %d", tt.keyType, got, tt.expected)
			}
		})
	}
}

func TestRPMConstants(t *testing.T) {
	// Verify constants match AC requirements
	if UserKeyRPM != 2000 {
		t.Errorf("UserKeyRPM = %d, want 2000", UserKeyRPM)
	}
	if FriendKeyRPM != 60 {
		t.Errorf("FriendKeyRPM = %d, want 60", FriendKeyRPM)
	}
}

func TestGetRPMForAPIKey(t *testing.T) {
	tests := []struct {
		name     string
		apiKey   string
		expected int
	}{
		{
			name:     "User key sk-troll prefix",
			apiKey:   "sk-troll-abc123",
			expected: UserKeyRPM,
		},
		{
			name:     "User key sk-trollllm prefix",
			apiKey:   "sk-trollllm-user-abc123",
			expected: UserKeyRPM,
		},
		{
			name:     "Friend key sk-trollllm-friend prefix",
			apiKey:   "sk-trollllm-friend-abc123",
			expected: FriendKeyRPM,
		},
		{
			name:     "Unknown key",
			apiKey:   "sk-other-abc123",
			expected: DefaultRPM,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GetRPMForAPIKey(tt.apiKey)
			if got != tt.expected {
				t.Errorf("GetRPMForAPIKey(%q) = %d, want %d", tt.apiKey, got, tt.expected)
			}
		})
	}
}

// TestUserKeyRPMIgnoresTier verifies that User Keys always get 2000 RPM
// regardless of any tier value in the database (AC1, AC2 from Story 1.2)
func TestUserKeyRPMIgnoresTier(t *testing.T) {
	// Test various User Key formats - all should get 2000 RPM
	// The rate limiter uses only the key prefix, completely ignoring any tier field
	userKeys := []struct {
		name        string
		apiKey      string
		description string
	}{
		{
			name:        "User key - simulated dev tier",
			apiKey:      "sk-troll-dev-user-12345",
			description: "Would be dev tier in old system",
		},
		{
			name:        "User key - simulated pro tier",
			apiKey:      "sk-troll-pro-user-67890",
			description: "Would be pro tier in old system",
		},
		{
			name:        "User key - simulated pro-troll tier",
			apiKey:      "sk-troll-protroll-user-abcde",
			description: "Would be pro-troll tier in old system",
		},
		{
			name:        "User key - no tier indication",
			apiKey:      "sk-troll-abc123",
			description: "User key without tier indication",
		},
		{
			name:        "User key - sk-trollllm format with dev",
			apiKey:      "sk-trollllm-dev-abc123",
			description: "sk-trollllm format, would be dev tier",
		},
		{
			name:        "User key - sk-trollllm format with pro",
			apiKey:      "sk-trollllm-pro-xyz789",
			description: "sk-trollllm format, would be pro tier",
		},
	}

	for _, tt := range userKeys {
		t.Run(tt.name, func(t *testing.T) {
			got := GetRPMForAPIKey(tt.apiKey)
			if got != UserKeyRPM {
				t.Errorf("GetRPMForAPIKey(%q) = %d, want %d (2000 RPM for all User Keys, tier ignored)\n%s",
					tt.apiKey, got, UserKeyRPM, tt.description)
			}
		})
	}

	// Verify the constant is exactly 2000 as per updated AC
	if UserKeyRPM != 2000 {
		t.Errorf("UserKeyRPM constant = %d, must be exactly 2000 per updated AC", UserKeyRPM)
	}
}
