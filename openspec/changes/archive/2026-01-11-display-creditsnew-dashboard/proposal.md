# Change Proposal: Display creditsNew on Dashboard

## Change ID
`display-creditsnew-dashboard`

## Summary
Add display of the `creditsNew` field on the user dashboard at `http://localhost:8080/dashboard` to show OpenHands credits balance alongside the existing OhMyGPT credits display.

## Context
The system currently has a dual credits system:
- `credits`: OhMyGPT credits (port 8005, 2500 VND/$1 rate)
- `creditsNew`: OpenHands credits (port 8004, 1500 VND/$1 rate)

While both fields exist in the backend `usersNew` collection and are functional in billing, only the `credits` field is currently displayed on the user dashboard. Users cannot see their `creditsNew` balance, which creates confusion about their available OpenHands credits.

## Motivation
- Users need visibility into their `creditsNew` balance to understand their OpenHands credit status
- The dual credits system is already implemented but lacks complete UI transparency
- Users purchasing credits (which go to `creditsNew`) should see their balance reflected on the dashboard

## Goals
1. Display `creditsNew` balance on the dashboard alongside existing `credits` display
2. Clearly differentiate between OhMyGPT credits and OpenHands credits
3. Update API types to include `creditsNew` in frontend interfaces
4. Maintain consistency with existing dashboard design patterns

## Non-Goals
- Modifying backend credit allocation logic (already implemented)
- Changing upstream routing behavior
- Altering payment flow (already adds to `creditsNew`)

## Scope
This change affects:
- **Frontend**: Dashboard UI component and API type definitions
- **Backend**: API response to include `creditsNew` field
- **Specs**: Dashboard UI requirements

## Related Work
- Archive: `2026-01-11-add-creditsnew-dual-rate` (implemented dual credit system)
- Archive: `2026-01-11-add-dual-credits-upstream-routing` (implemented billing routing)
- Spec: `billing` (documents dual credits system)

## Success Criteria
1. Dashboard displays both `credits` and `creditsNew` balances
2. Each balance is labeled with its upstream provider (OhMyGPT / OpenHands)
3. Each balance shows its respective rate (2500 VND/$1 / 1500 VND/$1)
4. API returns `creditsNew` in user profile response
5. TypeScript interfaces include `creditsNew` field
