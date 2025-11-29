# Tasks: Rename GoProxy Factory References to TrollLLM

## Implementation Tasks

### 1. Rename Types and Structs
- [x] Rename `FactoryKey` to `TrollKey` in `internal/keypool/model.go`
- [x] Rename `FactoryKeyStatus` to `TrollKeyStatus` in `internal/keypool/model.go`
- [x] Rename `FactoryOpenAIMessage` to `TrollOpenAIMessage` in `transformers/request.go`
- [x] Rename `FactoryOpenAIRequest` to `TrollOpenAIRequest` in `transformers/request.go`
- [x] Rename `FactoryOpenAIResponseTransformer` to `TrollOpenAIResponseTransformer` in `transformers/response.go`

### 2. Rename Functions
- [x] Rename `TransformToFactoryOpenAI` to `TransformToTrollOpenAI` in `transformers/request.go`
- [x] Rename `GetFactoryOpenAIHeaders` to `GetTrollOpenAIHeaders` in `transformers/request.go`
- [x] Rename `NewFactoryOpenAIResponseTransformer` to `NewTrollOpenAIResponseTransformer` in `transformers/response.go`
- [x] Rename `handleFactoryOpenAIRequest` to `handleTrollOpenAIRequest` in `main.go`
- [x] Rename `handleFactoryOpenAINonStreamResponse` to `handleTrollOpenAINonStreamResponse` in `main.go`
- [x] Rename `handleFactoryOpenAIStreamResponse` to `handleTrollOpenAIStreamResponse` in `main.go`
- [x] Rename `UpdateFactoryKeyUsage` to `UpdateTrollKeyUsage` in `internal/usage/tracker.go`
- [x] Rename `FactoryKeysCollection` to `TrollKeysCollection` in `db/mongodb.go`

### 3. Rename Variables
- [x] Rename `factoryKeyPool` to `trollKeyPool` in `main.go`
- [x] Rename `factoryAPIKey` to `trollAPIKey` in `main.go`
- [x] Rename `factoryKeyID` to `trollKeyID` in `main.go` and related files
- [x] Rename `factoryReq` to `trollReq` in `main.go`
- [x] Rename `factoryResp` to `trollResp` in `main.go` and `transformers/response.go`
- [x] Update `FactoryKeyID` field in structs to `TrollKeyID`

### 4. Update Database References
- [x] Change collection name from `factory_keys` to `troll_keys` in `db/mongodb.go`

### 5. Update Environment Variables
- [x] Change `FACTORY_API_KEY` references to `TROLL_API_KEY` in `main.go`

### 6. Update Log Messages and Comments
- [x] Update log messages referencing "Factory" to "TrollLLM"
- [x] Update code comments referencing "Factory" to "TrollLLM"

### 7. Update Documentation
- [x] Update `docs.html` title from "Factory Go API" to "TrollLLM API"
- [x] Update `docs.html` content and branding

### 8. Update Identity Blockers
- [x] Keep regex patterns in `transformers/response.go` that block "Factory" mentions (upstream provider)

## Verification
- [x] Run `go build` to verify compilation
- [x] Run `go vet` for static analysis
- [x] Test API endpoints still work correctly (build verification only)
