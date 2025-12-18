// Promotion Configuration - Bonus 15% Credits
// Duration: 2025-12-18 22:00 → 2025-12-20 22:00 (UTC+7)

export const PROMO_CONFIG = {
  // TEMP: Set to past for local testing - revert before deploy!
  startDate: new Date('2025-12-18T00:00:00+07:00'),
  endDate: new Date('2025-12-20T22:00:00+07:00'),
  bonusPercent: 15,
}

export interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number // total milliseconds remaining
}

/**
 * Check if the promotion is currently active
 */
export function isPromoActive(): boolean {
  const now = new Date()
  return now >= PROMO_CONFIG.startDate && now < PROMO_CONFIG.endDate
}

/**
 * Get time remaining until promotion ends
 * Returns { days, hours, minutes, seconds, total }
 */
export function getTimeRemaining(): TimeRemaining {
  const now = new Date()
  const diff = PROMO_CONFIG.endDate.getTime() - now.getTime()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, total: diff }
}

/**
 * Calculate bonus credits based on amount
 * @param amount - Original amount in USD
 * @returns Total credits including bonus (amount * 1.15)
 */
export function calculateBonusCredits(amount: number): number {
  return amount * (1 + PROMO_CONFIG.bonusPercent / 100)
}

/**
 * Get bonus amount only
 * @param amount - Original amount in USD
 * @returns Bonus amount (amount * 0.15)
 */
export function getBonusAmount(amount: number): number {
  return amount * (PROMO_CONFIG.bonusPercent / 100)
}
