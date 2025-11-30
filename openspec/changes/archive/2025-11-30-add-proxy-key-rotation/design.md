# Design: Proxy Key Rotation

## Context
- Hiện tại: 3 proxies, 5 keys
- Round-robin qua proxies, mỗi proxy chỉ dùng primary key
- Keys secondary chỉ dùng khi primary fail
- Admin muốn tất cả keys được sử dụng đều

## Goals
- Round-robin qua TẤT CẢ keys của mỗi proxy
- Hot reload bindings mà không cần restart goproxy
- UI trực quan để admin cấu hình

## Non-Goals
- Không thay đổi cơ chế round-robin qua proxies
- Không thay đổi health check logic

## Decisions

### 1. Round-robin per Proxy
**Decision**: Mỗi proxy có riêng `keyIndex` để track current key

```go
type ProxyPool struct {
    // existing fields...
    keyIndex map[string]int  // proxyId -> current key index
}

func (p *ProxyPool) getNextKeyForProxy(proxy *Proxy) string {
    bindings := p.bindings[proxy.ID]
    if len(bindings) == 0 {
        return ""
    }
    
    // Sort by priority
    sort.Slice(bindings, func(i, j int) bool {
        return bindings[i].Priority < bindings[j].Priority
    })
    
    // Round-robin through all active bindings
    idx := p.keyIndex[proxy.ID]
    for i := 0; i < len(bindings); i++ {
        current := (idx + i) % len(bindings)
        if bindings[current].IsActive {
            p.keyIndex[proxy.ID] = (current + 1) % len(bindings)
            return bindings[current].FactoryKeyID
        }
    }
    return ""
}
```

**Rationale**: Giữ proxy round-robin như cũ, thêm key round-robin per proxy

### 2. Hot Reload Strategy
**Decision**: Dual approach - manual trigger + periodic auto-reload

1. **Manual**: `GET /reload` endpoint để admin trigger
2. **Auto**: Background goroutine reload từ DB mỗi 30s

```go
func (p *ProxyPool) StartAutoReload(interval time.Duration) {
    go func() {
        ticker := time.NewTicker(interval)
        for range ticker.C {
            if err := p.LoadFromDB(); err != nil {
                log.Printf("⚠️ Auto-reload failed: %v", err)
            } else {
                log.Printf("🔄 Auto-reloaded proxy bindings")
            }
        }
    }()
}
```

**Rationale**: 
- Manual trigger cho thay đổi urgent
- Auto-reload đảm bảo sync ngay cả khi admin quên trigger

### 3. Priority System
**Decision**: Mở rộng từ 1-2 thành 1-10

- Priority 1 = highest priority (used first)
- Priority 10 = lowest priority (used last)
- Keys cùng priority sẽ random order khi reload

**Rationale**: Linh hoạt hơn, cho phép fine-grained control

## Risks / Trade-offs

### Risk: Race condition khi reload
**Mitigation**: Mutex lock khi update bindings, không ảnh hưởng request processing

### Trade-off: Auto-reload interval
- 30s: Balance giữa freshness và DB load
- Có thể config qua env `BINDING_RELOAD_INTERVAL`

## Migration Plan
1. Deploy goproxy changes (backward compatible)
2. Deploy backend API changes
3. Deploy frontend UI
4. Test với existing bindings

## Open Questions
- [x] Interval cho auto-reload? → 30s default, configurable
- [x] Max keys per proxy? → Giữ unlimited, nhưng recommend <= 5
