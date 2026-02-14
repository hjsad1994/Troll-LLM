package db

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

const DeletedKeysArchiveCollectionName = "deleted_keys_archive"

// ArchiveDeletedDocument stores a snapshot of a document before deletion.
func ArchiveDeletedDocument(ctx context.Context, sourceCollection string, sourceID string, reason string, deletedBy string, document interface{}, metadata map[string]interface{}) error {
	archiveDoc := bson.M{
		"sourceCollection": sourceCollection,
		"sourceId":         sourceID,
		"reason":           reason,
		"deletedBy":        deletedBy,
		"deletedAt":        time.Now().UTC(),
		"document":         document,
	}

	if len(metadata) > 0 {
		archiveDoc["metadata"] = metadata
	}

	_, err := GetCollection(DeletedKeysArchiveCollectionName).InsertOne(ctx, archiveDoc)
	return err
}
