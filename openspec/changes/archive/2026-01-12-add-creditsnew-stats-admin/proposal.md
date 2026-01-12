# Proposal: Add CreditsNew Stats to Admin Dashboard

## Overview

Add aggregate statistics for `creditsNew` (OpenHands credits) and `creditsNewUsed` (OpenHands spending) to the admin dashboard User Stats card. This provides visibility into OpenHands-specific credit usage alongside existing OhMyGPT credit statistics.

## Why

Currently, the admin dashboard displays comprehensive statistics for the OhMyGPT credit system (`credits`, `creditsUsed`, `refCredits`) but lacks visibility into the parallel OpenHands credit system (`creditsNew`, `creditsNewUsed`). Since the platform operates a dual-credit system where:
- OhMyGPT uses `credits` field (port 8005, `billing_upstream: "ohmygpt"`)
- OpenHands uses `creditsNew` field (port 8004, `billing_upstream: "openhands"`)

Administrators need complete visibility into both credit systems to effectively monitor platform usage, financial performance, and billing distribution across both upstreams.

**User Impact:** Admins will be able to track OpenHands credit balances and spending at a glance, enabling better financial monitoring and capacity planning for the platform.

## Scope

This change adds two new statistics to the existing "User Stats" card on the admin dashboard:
1. **CreditsNew Total** - Sum of all `creditsNew` balances across all users
2. **CreditsNewUsed Total** - Sum of all `creditsNewUsed` spending across all users

The statistics will appear alongside existing credit metrics (Total Credits, Burned, Ref, Input/Output tokens, Users, Active).

## Goals

- Display aggregate `creditsNew` totals across all users in the admin dashboard
- Display aggregate `creditsNewUsed` totals to show OpenHands spending
- Maintain consistent formatting with existing credit statistics
- Support the existing period filter (1h, 3h, 8h, 24h, 7d, all)
- Use appropriate color coding for visual distinction from OhMyGPT credits

## Non-Goals

- Modifying individual user credit management pages
- Changing billing logic or credit deduction behavior
- Adding period-based filtering for `creditsNew` totals (always shows current balances)
- Creating new API endpoints (will extend existing `/admin/user-stats`)

## Implementation Strategy

### Backend Changes
1. Extend `userRepository.getUserStats()` to aggregate `creditsNew` and `creditsNewUsed` from the `usersNew` collection
2. Update `/admin/user-stats` API response to include new fields

### Frontend Changes
1. Update `UserStats` interface in admin page to include new fields
2. Add two new stat rows in the User Stats card:
   - CreditsNew Total (with emerald/teal color)
   - CreditsNewUsed Total (with red/rose color for spent credits)

## Dependencies

- Existing `creditsNew` and `creditsNewUsed` fields in User model (already implemented)
- Existing `/admin/user-stats` API endpoint
- Existing admin dashboard UI structure

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance impact from additional aggregation | Low | Uses same aggregation pipeline as existing stats, minimal overhead |
| UI crowding in User Stats card | Low | Add at end of existing stats list, mobile-responsive grid handles layout |
| Period filter confusion | Low | Document that credit totals are current balances (not period-filtered) |

## Success Criteria

- [ ] Admin dashboard displays total `creditsNew` balance across all users
- [ ] Admin dashboard displays total `creditsNewUsed` spending across all users
- [ ] New statistics appear in the existing User Stats card
- [ ] Statistics format matches existing credit displays (formatUSD helper)
- [ ] No performance degradation in dashboard load time
- [ ] Mobile-responsive layout maintains readability
