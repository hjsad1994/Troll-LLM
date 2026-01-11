package userkey

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"goproxy/db"
)

var (
	ErrKeyNotFound         = errors.New("API key not found")
	ErrKeyRevoked          = errors.New("API key has been revoked")
	ErrCreditsExpired      = errors.New("credits have expired")
	ErrInsufficientCredits = errors.New("insufficient credits")
	ErrMigrationRequired   = errors.New("migration required: please visit https://trollllm.xyz/dashboard to migrate your account")
)

func ValidateKey(apiKey string) (*UserKey, error) {
	// 1. Try user_keys collection first
	userKey, err := validateFromUserKeys(apiKey)
	if err == nil {
		return userKey, nil
	}

	// 2. If not found in user_keys, fallback to usersNew collection
	if err == ErrKeyNotFound {
		return validateFromUsersNewCollection(apiKey)
	}

	return nil, err
}

// validateFromUserKeys validates API key from user_keys collection
func validateFromUserKeys(apiKey string) (*UserKey, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var userKey UserKey
	err := db.UserKeysCollection().FindOne(ctx, bson.M{"_id": apiKey}).Decode(&userKey)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrKeyNotFound
		}
		return nil, err
	}

	if !userKey.IsActive {
		return nil, ErrKeyRevoked
	}

	if userKey.IsExpired() {
		// Delete expired key from collection
		go deleteExpiredKey(apiKey)
		return nil, ErrCreditsExpired
	}

	// Check migration status from usersNew collection
	var user LegacyUser
	err = db.UsersNewCollection().FindOne(ctx, bson.M{"_id": userKey.Name}).Decode(&user)
	if err == nil {
		// User found in usersNew, check migration status
		if user.Role != "admin" && !user.Migration {
			return nil, ErrMigrationRequired
		}
	}
	// If user not found in usersNew, skip migration check (might be a different auth system)

	return &userKey, nil
}

// validateFromUsersNewCollection validates API key from usersNew collection
// Used for sk-trollllm-* format keys stored in usersNew.apiKey field
func validateFromUsersNewCollection(apiKey string) (*UserKey, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user LegacyUser
	err := db.UsersNewCollection().FindOne(ctx, bson.M{"apiKey": apiKey}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrKeyNotFound
		}
		return nil, err
	}

	if !user.IsActive {
		return nil, ErrKeyRevoked
	}

	// Check expiry
	if user.ExpiresAt != nil && time.Now().After(*user.ExpiresAt) {
		return nil, ErrCreditsExpired
	}

	// Check migration status (admin bypass)
	if user.Role != "admin" && !user.Migration {
		return nil, ErrMigrationRequired
	}

	// Check if user has credits (either OhMyGPT or OpenHands balance)
	if user.Credits <= 0 && user.CreditsNew <= 0 && user.RefCredits <= 0 {
		return nil, ErrInsufficientCredits
	}

	// Convert to UserKey format for compatibility
	return &UserKey{
		ID:        apiKey,
		Name:      user.ID, // username
		IsActive:  user.IsActive,
		ExpiresAt: user.ExpiresAt,
	}, nil
}

func deleteExpiredKey(apiKey string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	db.UserKeysCollection().DeleteOne(ctx, bson.M{"_id": apiKey})
}

func GetKeyByID(apiKey string) (*UserKey, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var userKey UserKey
	err := db.UserKeysCollection().FindOne(ctx, bson.M{"_id": apiKey}).Decode(&userKey)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrKeyNotFound
		}
		return nil, err
	}

	return &userKey, nil
}

// UserCredits represents the credits balance info from usersNew collection
type UserCredits struct {
	Username   string  `bson:"_id"`
	Credits    float64 `bson:"credits"`       // OhMyGPT balance (port 8005)
	CreditsNew float64 `bson:"creditsNew"`    // OpenHands balance (port 8004)
	RefCredits float64 `bson:"refCredits"`
}

// CreditCheckResult contains the result of credits balance check
type CreditCheckResult struct {
	HasCredits    bool    // true if user has any credits
	UseRefCredits bool    // true if user will use refCredits (main balance exhausted)
	Credits       float64 // main credits balance (USD)
	RefCredits    float64 // referral credits balance (USD)
}

// CheckUserCredits checks if user has sufficient credits (credits > 0 or refCredits > 0)
// Returns nil if user has credits, ErrInsufficientCredits if both <= 0
func CheckUserCredits(username string) error {
	if username == "" {
		return nil // No username means env-based auth, skip check
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user UserCredits
	err := db.UsersNewCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return ErrInsufficientCredits // User not found = no credits
		}
		return err
	}

	// Block if both credits <= 0 AND refCredits <= 0
	if user.Credits <= 0 && user.RefCredits <= 0 {
		return ErrInsufficientCredits
	}

	return nil
}

// CheckUserCreditsOpenHands checks if user has sufficient creditsNew balance (for OpenHands upstream, port 8004)
// Returns ErrInsufficientCredits if creditsNew <= 0
func CheckUserCreditsOpenHands(username string) error {
	if username == "" {
		return nil // No username means env-based auth, skip check
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user struct {
		CreditsNew float64 `bson:"creditsNew"`
	}
	err := db.UsersNewCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return ErrInsufficientCredits // User not found = no credits
		}
		return err
	}

	// Block if creditsNew <= 0 (no fallback to credits field)
	if user.CreditsNew <= 0 {
		return ErrInsufficientCredits
	}

	return nil
}

// CheckUserCreditsDetailed returns detailed credits balance check result
// including whether refCredits will be used
func CheckUserCreditsDetailed(username string) (*CreditCheckResult, error) {
	if username == "" {
		return &CreditCheckResult{HasCredits: true, UseRefCredits: false}, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user UserCredits
	err := db.UsersNewCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return &CreditCheckResult{HasCredits: false}, ErrInsufficientCredits
		}
		return nil, err
	}

	result := &CreditCheckResult{
		Credits:    user.Credits,
		RefCredits: user.RefCredits,
	}

	// Check if user has any credits
	if user.Credits <= 0 && user.RefCredits <= 0 {
		result.HasCredits = false
		return result, ErrInsufficientCredits
	}

	result.HasCredits = true
	// User will use refCredits if main credits is exhausted
	result.UseRefCredits = user.Credits <= 0 && user.RefCredits > 0

	return result, nil
}

// GetUserCredits returns the current credits balance for a user (USD)
func GetUserCredits(username string) (float64, error) {
	if username == "" {
		return 0, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user UserCredits
	err := db.UsersNewCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return 0, nil
		}
		return 0, err
	}

	return user.Credits, nil
}

// GetUserCreditsNew returns the current creditsNew balance (OpenHands) for a user (USD)
func GetUserCreditsNew(username string) (float64, error) {
	if username == "" {
		return 0, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user UserCredits
	err := db.UsersNewCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return 0, nil
		}
		return 0, err
	}

	return user.CreditsNew, nil
}

// GetUserCreditsWithRef returns both credits and refCredits for a user (USD)
func GetUserCreditsWithRef(username string) (credits float64, refCredits float64, err error) {
	if username == "" {
		return 0, 0, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user UserCredits
	err = db.UsersNewCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return 0, 0, nil
		}
		return 0, 0, err
	}

	return user.Credits, user.RefCredits, nil
}

// GetUserCreditsNew returns creditsNew balance for a user (USD) - used for OpenHands
func GetUserCreditsNew(username string) (float64, error) {
	if username == "" {
		return 0, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user UserCredits
	err := db.UsersNewCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return 0, nil
		}
		return 0, err
	}

	return user.CreditsNew, nil
}

// =============================================================================
// Story 2.2: Zero-Debt Policy Enforcement - Pre-deduction Balance Check
// =============================================================================

// AffordabilityResult contains the result of pre-request affordability check
type AffordabilityResult struct {
	CanAfford        bool    // true if user can afford the request
	Credits          float64 // main credits balance (USD)
	RefCredits       float64 // referral credits balance (USD)
	TotalBalance     float64 // credits + refCredits
	RequestCost      float64 // cost of the request
	RemainingBalance float64 // balance after deduction (if affordable)
}

// CanAffordRequest checks if user has sufficient credits for a specific request cost
// Returns AffordabilityResult with balance details for error messages
// AC1: Block request if cost > balance (before processing)
func CanAffordRequest(username string, cost float64) (*AffordabilityResult, error) {
	// Zero cost always passes
	if cost <= 0 {
		return &AffordabilityResult{
			CanAfford:   true,
			RequestCost: cost,
		}, nil
	}

	// Empty username bypasses check (env-based auth)
	if username == "" {
		return &AffordabilityResult{
			CanAfford:   true,
			RequestCost: cost,
		}, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user UserCredits
	err := db.UsersNewCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// User not found = no credits
			return &AffordabilityResult{
				CanAfford:    false,
				RequestCost:  cost,
				TotalBalance: 0,
			}, ErrInsufficientCredits
		}
		return nil, err
	}

	totalBalance := user.Credits + user.RefCredits
	canAfford := totalBalance >= cost

	result := &AffordabilityResult{
		CanAfford:        canAfford,
		Credits:          user.Credits,
		RefCredits:       user.RefCredits,
		TotalBalance:     totalBalance,
		RequestCost:      cost,
		RemainingBalance: totalBalance - cost,
	}

	if !canAfford {
		return result, InsufficientCreditsForRequest(cost, totalBalance)
	}

	return result, nil
}

// InsufficientCreditsForRequest creates an error with cost and balance details
// Error message format: "insufficient credits for request. Cost: $X.XX, Balance: $Y.YY"
func InsufficientCreditsForRequest(cost, balance float64) error {
	return fmt.Errorf("insufficient credits for request. Cost: $%.2f, Balance: $%.2f", cost, balance)
}
