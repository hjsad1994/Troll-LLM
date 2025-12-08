package userkey

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"goproxy/db"
)

var (
	ErrKeyNotFound         = errors.New("API key not found")
	ErrKeyRevoked          = errors.New("API key has been revoked")
	ErrPlanExpired         = errors.New("plan has expired")
	ErrInsufficientCredits = errors.New("insufficient credits")
)

func ValidateKey(apiKey string) (*UserKey, error) {
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

	if userKey.IsPlanExpired() {
		// Delete expired key from collection
		go deleteExpiredKey(apiKey)
		return nil, ErrPlanExpired
	}

	return &userKey, nil
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

// UserCredits represents the credits balance info from users collection
type UserCredits struct {
	Username   string  `bson:"_id"`
	Credits    float64 `bson:"credits"`
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
	err := db.UsersCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil // User not found in users collection, allow (legacy)
		}
		return err
	}

	// Block if both credits <= 0 AND refCredits <= 0
	if user.Credits <= 0 && user.RefCredits <= 0 {
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
	err := db.UsersCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return &CreditCheckResult{HasCredits: true, UseRefCredits: false}, nil
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
	err := db.UsersCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return 0, nil
		}
		return 0, err
	}

	return user.Credits, nil
}

// GetUserCreditsWithRef returns both credits and refCredits for a user (USD)
func GetUserCreditsWithRef(username string) (credits float64, refCredits float64, err error) {
	if username == "" {
		return 0, 0, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user UserCredits
	err = db.UsersCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return 0, 0, nil
		}
		return 0, 0, err
	}

	return user.Credits, user.RefCredits, nil
}
