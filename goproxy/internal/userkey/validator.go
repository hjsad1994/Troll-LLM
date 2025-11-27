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
	ErrKeyNotFound    = errors.New("API key not found")
	ErrKeyRevoked     = errors.New("API key has been revoked")
	ErrQuotaExhausted = errors.New("token quota exhausted")
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

	if userKey.IsExhausted() {
		return &userKey, ErrQuotaExhausted
	}

	return &userKey, nil
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
