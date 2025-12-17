## ADDED Requirements

### Requirement: Homepage Floating Buy Now Button
The system SHALL display a floating "Buy Now" button on the homepage that remains visible as user scrolls.

#### Scenario: Display floating Buy Now button
- **WHEN** user visits the homepage (`/`)
- **THEN** the system SHALL display a floating button at bottom-right corner of the screen
- **AND** the button text SHALL be "Buy Now" in English or "Mua ngay" in Vietnamese based on language setting
- **AND** the button SHALL have fixed position so it remains visible during scroll
- **AND** the button SHALL have prominent styling (emerald/green or indigo color scheme)

#### Scenario: Navigate to checkout page from floating button
- **WHEN** user clicks the floating "Buy Now" button
- **THEN** the system SHALL navigate user to `/checkout` page

#### Scenario: Button animation for attention
- **WHEN** floating button is displayed
- **THEN** the button SHALL have a subtle pulse or glow animation to attract user attention
- **AND** animation SHALL not be distracting or annoying

#### Scenario: Mobile responsive display
- **WHEN** user views homepage on mobile device
- **THEN** the floating button SHALL be positioned to not overlap important content
- **AND** the button SHALL remain easily tappable (minimum 44px touch target)
- **AND** the button MAY be slightly smaller on mobile to save screen space
