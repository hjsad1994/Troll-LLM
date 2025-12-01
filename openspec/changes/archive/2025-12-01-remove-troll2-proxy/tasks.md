## 1. Code Removal

- [x] 1.1 Delete `goproxy/internal/troll2/` directory
- [x] 1.2 Remove `troll2` import from `main.go`
- [x] 1.3 Remove `handleTroll2Request` function from `main.go`
- [x] 1.4 Remove `handleTroll2MessagesRequest` function from `main.go`
- [x] 1.5 Remove Troll-2 routing logic from `selectUpstreamConfig` in `main.go`
- [x] 1.6 Remove Troll-2 routing in OpenAI handler (`upstreamConfig.KeyID == "troll-2"`)
- [x] 1.7 Remove Troll-2 routing in Messages handler
- [x] 1.8 Remove `MEGALLM_SERVER` and `MEGALLM_API_KEY` environment variable handling

## 2. Configuration Cleanup

- [x] 2.1 Remove 4 Troll-2 models from `config.json`
- [x] 2.2 Remove 4 Troll-2 models from `config.prod.json`
- [x] 2.3 Update `config/config.go` comment to remove troll-2 reference

## 3. Verification

- [x] 3.1 Build goproxy to verify no compilation errors
- [ ] 3.2 Verify remaining models still work (main/troll upstreams)
