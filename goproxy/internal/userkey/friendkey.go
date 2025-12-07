package userkey

import (
	"context"
	"errors"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"goproxy/db"
)

var (
	ErrFriendKeyNotFound       = errors.New("friend key not found")
	ErrFriendKeyInactive       = errors.New("friend key is inactive")
	ErrFriendKeyOwnerInactive  = errors.New("friend key owner account is inactive")
	ErrFriendKeyModelNotAllowed = errors.New("model not configured for friend key")
	ErrFriendKeyModelDisabled   = errors.New("model disabled for friend key")
	ErrFriendKeyModelLimitExceeded = errors.New("friend key model limit exceeded")
	ErrFriendKeyOwnerNoCredits = errors.New("friend key owner has no credits")
	ErrFriendKeyOwnerFreeTier  = errors.New("friend key owner is free tier")
)

type ModelLimit struct {
	ModelID  string  `bson:"modelId"`
	LimitUsd float64 `bson:"limitUsd"`
	UsedUsd  float64 `bson:"usedUsd"`
	Enabled  *bool   `bson:"enabled,omitempty"`
}

type FriendKey struct {
	ID            string       `bson:"_id"`
	OwnerID       string       `bson:"ownerId"`
	IsActive      bool         `bson:"isActive"`
	CreatedAt     time.Time    `bson:"createdAt"`
	RotatedAt     *time.Time   `bson:"rotatedAt,omitempty"`
	ModelLimits   []ModelLimit `bson:"modelLimits"`
	TotalUsedUsd  float64      `bson:"totalUsedUsd"`
	RequestsCount int64        `bson:"requestsCount"`
	LastUsedAt    *time.Time   `bson:"lastUsedAt,omitempty"`
}

type FriendKeyOwner struct {
	Username   string  `bson:"_id"`
	IsActive   bool    `bson:"isActive"`
	Plan       string  `bson:"plan"`
	Credits    float64 `bson:"credits"`
	RefCredits float64 `bson:"refCredits"`
}

type FriendKeyValidationResult struct {
	FriendKey     *FriendKey
	Owner         *FriendKeyOwner
	UseRefCredits bool
}

func IsFriendKey(apiKey string) bool {
	return strings.HasPrefix(apiKey, "sk-trollllm-friend-")
}

// ValidateFriendKeyBasic validates a Friend Key without checking model limits
// Used for initial authentication before model is parsed
func ValidateFriendKeyBasic(apiKey string) (*FriendKeyValidationResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Find the friend key
	var friendKey FriendKey
	err := db.FriendKeysCollection().FindOne(ctx, bson.M{"_id": apiKey}).Decode(&friendKey)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrFriendKeyNotFound
		}
		return nil, err
	}

	// 2. Check if friend key is active
	if !friendKey.IsActive {
		return nil, ErrFriendKeyInactive
	}

	// 3. Find the owner
	var owner FriendKeyOwner
	err = db.UsersCollection().FindOne(ctx, bson.M{"_id": friendKey.OwnerID}).Decode(&owner)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrFriendKeyNotFound
		}
		return nil, err
	}

	// 4. Check if owner is active
	if !owner.IsActive {
		return nil, ErrFriendKeyOwnerInactive
	}

	// 5. Check if owner is free tier
	if owner.Plan == "free" || owner.Plan == "" {
		return nil, ErrFriendKeyOwnerFreeTier
	}

	// 6. Check if owner has credits
	if owner.Credits <= 0 && owner.RefCredits <= 0 {
		return nil, ErrFriendKeyOwnerNoCredits
	}

	// Determine if refCredits will be used
	useRefCredits := owner.Credits <= 0 && owner.RefCredits > 0

	return &FriendKeyValidationResult{
		FriendKey:     &friendKey,
		Owner:         &owner,
		UseRefCredits: useRefCredits,
	}, nil
}

// CheckFriendKeyModelLimit checks if a Friend Key can use a specific model
func CheckFriendKeyModelLimit(apiKey string, modelID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var friendKey FriendKey
	err := db.FriendKeysCollection().FindOne(ctx, bson.M{"_id": apiKey}).Decode(&friendKey)
	if err != nil {
		return ErrFriendKeyNotFound
	}

	// Find model limit
	var modelLimit *ModelLimit
	for i := range friendKey.ModelLimits {
		if friendKey.ModelLimits[i].ModelID == modelID {
			modelLimit = &friendKey.ModelLimits[i]
			break
		}
	}

	if modelLimit == nil || modelLimit.LimitUsd <= 0 {
		return ErrFriendKeyModelNotAllowed
	}

	// Check if model is disabled
	if modelLimit.Enabled != nil && !*modelLimit.Enabled {
		return ErrFriendKeyModelDisabled
	}

	if modelLimit.UsedUsd >= modelLimit.LimitUsd {
		return ErrFriendKeyModelLimitExceeded
	}

	return nil
}

// ValidateFriendKey validates a Friend Key with model limit check
func ValidateFriendKey(apiKey string, modelID string) (*FriendKeyValidationResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Find the friend key
	var friendKey FriendKey
	err := db.FriendKeysCollection().FindOne(ctx, bson.M{"_id": apiKey}).Decode(&friendKey)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrFriendKeyNotFound
		}
		return nil, err
	}

	// 2. Check if friend key is active
	if !friendKey.IsActive {
		return nil, ErrFriendKeyInactive
	}

	// 3. Find the owner
	var owner FriendKeyOwner
	err = db.UsersCollection().FindOne(ctx, bson.M{"_id": friendKey.OwnerID}).Decode(&owner)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrFriendKeyNotFound
		}
		return nil, err
	}

	// 4. Check if owner is active
	if !owner.IsActive {
		return nil, ErrFriendKeyOwnerInactive
	}

	// 5. Check if owner is free tier
	if owner.Plan == "free" || owner.Plan == "" {
		return nil, ErrFriendKeyOwnerFreeTier
	}

	// 6. Check if owner has credits
	if owner.Credits <= 0 && owner.RefCredits <= 0 {
		return nil, ErrFriendKeyOwnerNoCredits
	}

	// 7. Check model limit
	var modelLimit *ModelLimit
	for i := range friendKey.ModelLimits {
		if friendKey.ModelLimits[i].ModelID == modelID {
			modelLimit = &friendKey.ModelLimits[i]
			break
		}
	}

	if modelLimit == nil || modelLimit.LimitUsd <= 0 {
		return nil, ErrFriendKeyModelNotAllowed
	}

	// Check if model is disabled
	if modelLimit.Enabled != nil && !*modelLimit.Enabled {
		return nil, ErrFriendKeyModelDisabled
	}

	if modelLimit.UsedUsd >= modelLimit.LimitUsd {
		return nil, ErrFriendKeyModelLimitExceeded
	}

	// Determine if refCredits will be used
	useRefCredits := owner.Credits <= 0 && owner.RefCredits > 0

	return &FriendKeyValidationResult{
		FriendKey:     &friendKey,
		Owner:         &owner,
		UseRefCredits: useRefCredits,
	}, nil
}

func GetFriendKeyOwnerRPM(owner *FriendKeyOwner) int {
	switch owner.Plan {
	case "pro-troll":
		return 600
	case "pro":
		return 300
	case "dev":
		return 150
	default:
		return 0
	}
}

func UpdateFriendKeyUsage(apiKey string, modelID string, costUsd float64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now()

	// Update the specific model's usedUsd and overall stats
	_, err := db.FriendKeysCollection().UpdateOne(
		ctx,
		bson.M{
			"_id":                apiKey,
			"modelLimits.modelId": modelID,
		},
		bson.M{
			"$inc": bson.M{
				"modelLimits.$.usedUsd": costUsd,
				"totalUsedUsd":          costUsd,
				"requestsCount":         1,
			},
			"$set": bson.M{
				"lastUsedAt": now,
			},
		},
	)

	return err
}
