## REMOVED Requirements

### Requirement: Referral Code Generation
**Reason**: Referral system is being discontinued to simplify the platform.
**Migration**: Users will no longer have referral codes. Existing referral relationships will remain in database but won't be used.

### Requirement: Referral Registration Tracking
**Reason**: Referral system is being discontinued.
**Migration**: Registration will no longer accept or process `ref` parameter.

### Requirement: Referral Credits (Separate Balance)
**Reason**: Referral system is being discontinued.
**Migration**: Existing `refCredits` balances will remain usable but no new referral credits will be awarded.

### Requirement: Referral Credits Usage Priority
**Reason**: Referral system is being discontinued.
**Migration**: Existing `refCredits` can still be used as fallback when main credits are exhausted.

### Requirement: Referral Statistics
**Reason**: Referral system is being discontinued.
**Migration**: API endpoints for referral stats will be removed.

### Requirement: Referred Users List
**Reason**: Referral system is being discontinued.
**Migration**: API endpoint will be removed.

### Requirement: Referral Dashboard Page
**Reason**: Referral system is being discontinued.
**Migration**: `/referral` page will be removed from dashboard. Sidebar link will be removed.
