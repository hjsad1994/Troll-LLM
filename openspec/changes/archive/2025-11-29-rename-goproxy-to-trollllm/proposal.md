# Proposal: Rename GoProxy Factory References to TrollLLM

## Summary
Rename all "Factory" branding references in GoProxy codebase to "TrollLLM" for consistent branding across the entire platform.

## Motivation
The project has been rebranded from "Factory" to "TrollLLM". The backend and frontend have already been updated, but GoProxy still contains many "Factory" references in:
- Type and function names
- Variable names
- Log messages and comments
- Documentation (docs.html)
- Environment variable references

## Scope

### Code Changes (Go)
| Current | New |
|---------|-----|
| `FactoryOpenAIResponseTransformer` | `TrollOpenAIResponseTransformer` |
| `FactoryOpenAIMessage` | `TrollOpenAIMessage` |
| `FactoryOpenAIRequest` | `TrollOpenAIRequest` |
| `FactoryKey` | `TrollKey` |
| `FactoryKeyStatus` | `TrollKeyStatus` |
| `factoryKeyPool` | `trollKeyPool` |
| `factoryAPIKey` | `trollAPIKey` |
| `factoryKeyID` | `trollKeyID` |
| `TransformToFactoryOpenAI` | `TransformToTrollOpenAI` |
| `GetFactoryOpenAIHeaders` | `GetTrollOpenAIHeaders` |
| `handleFactoryOpenAI*` | `handleTrollOpenAI*` |
| `UpdateFactoryKeyUsage` | `UpdateTrollKeyUsage` |
| `FactoryKeysCollection` | `TrollKeysCollection` |

### Environment Variables
| Current | New |
|---------|-----|
| `FACTORY_API_KEY` | `TROLL_API_KEY` |

### Database Collection
| Current | New |
|---------|-----|
| `factory_keys` | `troll_keys` |

### Documentation
- Update `docs.html` title and content from "Factory Go API" to "TrollLLM API"

### Out of Scope (Keep as-is)
- Upstream API URLs (`app.factory.ai`) - these are external service endpoints
- User agent string (`factory-cli/x.x.x`) - required for upstream API authentication
- Header `x-factory-client: cli` - required for upstream API

## Impact
- **GoProxy**: Major refactoring of type names, functions, and variables
- **Backend**: Already updated to use `troll_keys` collection  
- **Frontend**: Already updated to use `/admin/troll-keys` routes

## Risks
- Must ensure database collection name change is consistent with backend
- Go compilation must pass after all renames
