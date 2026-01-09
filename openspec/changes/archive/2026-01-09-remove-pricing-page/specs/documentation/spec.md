## REMOVED Requirements

### Requirement: Pricing Documentation Page

**REMOVED** - The pricing documentation page and its navigation link have been removed from the documentation site.

#### Scenario: Pricing page removal
- **WHEN** a user navigates to `/docs/pricing`
- **THEN** the page SHALL return a 404 error or redirect to an appropriate page
- **AND** the page component `frontend/src/app/docs/pricing/page.tsx` SHALL NOT exist

#### Scenario: Pricing navigation link removal
- **WHEN** a user views any documentation page sidebar
- **THEN** the sidebar SHALL NOT contain a "Bảng giá" / "Pricing" link under "Tài nguyên" / "Resources" section
- **AND** the navigation configuration SHALL NOT include pricing in the resources items

#### Scenario: Adjacent page navigation updates
- **WHEN** a user views the Rate Limits page
- **THEN** the footer/breadcrumb navigation SHALL NOT link to the Pricing page
- **AND** the previous navigation link SHOULD point to the last integration page (Continue)

#### Scenario: Translation keys cleanup
- **WHEN** the translation files are updated
- **THEN** the `docsPricing` translation key SHOULD be removed from `frontend/src/lib/i18n.ts`
- **AND** the `sidebar.pricing` translation key SHOULD be removed from the i18n configuration
