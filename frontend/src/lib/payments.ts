/**
 * Payment configuration
 * Set NEXT_PUBLIC_PAYMENTS_ENABLED=false to disable payment functionality
 */
export const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED !== 'false'
