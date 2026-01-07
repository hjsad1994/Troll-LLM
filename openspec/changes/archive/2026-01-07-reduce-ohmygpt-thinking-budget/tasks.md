# Tasks: Reduce OhMyGPT Thinking Budget

## Overview

Reduce `thinking_budget` from 12,000 to 6,000 tokens for Opus 4.5 and Sonnet 4.5 in all OhMyGPT configuration files.

---

## Tasks

- [x] 1. Update development configuration
  - **File**: `goproxy/config-ohmygpt-dev.json`
  - **Action**: Change `thinking_budget` from 12000 to 6000 for:
    - `claude-opus-4-5-20251101` (line 19)
    - `claude-sonnet-4-5-20250929` (line 36)
  - **Validation**: Verify JSON syntax is valid

- [x] 2. Update production configuration
  - **File**: `goproxy/config-ohmygpt-prod.json`
  - **Action**: Change `thinking_budget` from 12000 to 6000 for:
    - `claude-opus-4-5-20251101` (line 19)
    - `claude-sonnet-4-5-20250929` (line 36)
  - **Validation**: Verify JSON syntax is valid

- [x] 3. Check and update other OhMyGPT configs
  - **Files to review**:
    - `config-openhands-local.json`
    - `config-openhands-prod.json`
    - `config-openhands-prod copy.json`
    - `config-openhands-prod-o.json`
  - **Result**: Only 2 OhMyGPT config files exist (both already updated above)
  - **Validation**: Verified that other configs use different upstream types (anthropic, openhands)

- [x] 4. Validate configuration changes
  - **Action**: Run JSON validation on all modified config files
  - **Command**: Used Python json.tool validator
  - **Result**: Both files parse without errors

- [ ] 5. Test with development environment
  - **Action**: Restart goproxy service with updated config
  - **Test Case**: Make a test request requiring thinking mode
  - **Validation**: Verify thinking budget is applied correctly (check max_tokens calculation)

- [ ] 6. Document the change
  - **File**: Update any relevant documentation if needed
  - **Content**: Note new thinking budget value of 6,000 tokens

---

## Dependencies

- Task 3 depends on Task 1 and Task 2 (same pattern, different files)
- Task 4 depends on Tasks 1, 2, 3 (all files must be updated first)
- Task 5 depends on Task 4 (configs must be valid before testing)

---

## Validation Checklist

- [x] All config files updated with `thinking_budget: 6000`
- [x] JSON syntax valid for all modified files
- [x] No other config values accidentally modified
- [ ] Development environment starts successfully
- [ ] Test request completes without errors
- [ ] Thinking tokens respect new 6,000 limit

---

## Rollback Plan

If issues arise:
1. Revert all `thinking_budget` values from 6000 back to 12000
2. Restart affected services
3. No data migration required (configuration-only change)
