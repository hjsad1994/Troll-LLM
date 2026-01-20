# Proposal: Add Dual-Domain AI Provider Display

## Overview

Update the dashboard UI to display two AI Provider URL options with their respective credit rates, allowing users to choose between standard (1500 VND/$1) and premium (2500 VND/$1) endpoints.

## Problem Statement

Currently, the dashboard shows a single AI Provider URL (`https://chat.trollllm.xyz`). However, the platform now supports two different domains with different rate structures:
- **chat.trollllm.xyz** - Standard endpoint with rate 1500 VND = $1 USD
- **chat2.trollllm.xyz** - Premium endpoint with rate 2500 VND = $1 USD

Users need visibility into both options to make informed decisions about which endpoint to use based on their budget and requirements.

## Proposed Solution

Enhance the dashboard's AI Provider section to:
1. Display both domain URLs clearly
2. Show rate information (1500 vs 2500) for each endpoint
3. Add visual distinction between standard and premium options
4. Support internationalization (English and Vietnamese)
5. Maintain existing copy-to-clipboard functionality for both URLs

## Benefits

- **Transparency**: Users can see both pricing options upfront
- **Flexibility**: Users can choose the endpoint that fits their budget
- **Clarity**: Clear rate information prevents confusion about billing
- **User Control**: Empowers users to make informed decisions

## Scope

### In Scope
- Frontend dashboard UI updates
- i18n translation additions
- Visual design for dual-endpoint display
- Rate information display

### Out of Scope
- Backend rate logic changes (already implemented)
- Payment flow modifications
- Go proxy routing changes
- Domain infrastructure setup

## Dependencies

- Existing credit rate system (1500 and 2500 VND/$1)
- Current dashboard UI structure
- i18n translation system
- Copy-to-clipboard functionality

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| User confusion about which endpoint to use | Add clear labels and descriptions for each option |
| UI clutter with two endpoints | Use clean, card-based design with visual hierarchy |
| Translation inconsistency | Ensure both EN and VI translations are complete |
| Mobile responsiveness issues | Test on small screens and ensure proper wrapping |

## Success Criteria

- [x] Both AI Provider URLs are displayed in the dashboard
- [x] Rate information (1500 and 2500) is clearly shown
- [x] Copy-to-clipboard works for both URLs
- [x] UI is responsive on mobile and desktop
- [x] Translations exist for both English and Vietnamese
- [x] Visual distinction between standard and premium is clear
