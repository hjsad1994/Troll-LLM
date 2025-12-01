## REMOVED Requirements

### Requirement: Admin Pricing Dashboard
**Reason**: The pricing dashboard managed a MongoDB pricing table that was not used for actual credit calculation. Real billing logic is handled by GoProxy using models.json configuration.
**Migration**: No migration needed - the pricing data in MongoDB was never used for billing.
