// ============================================================
// PROMO CONFIGURATION - DISABLED (kept for future use)
// Change dates and set active to enable promo
// ============================================================
// export const PROMO_CONFIG = {
//   startDate: new Date('2025-12-18T00:00:00+07:00'),
//   endDate: new Date('2025-12-20T22:00:00+07:00'),
//   bonusPercent: 15,
// }

// export interface TimeRemaining {
//   days: number
//   hours: number
//   minutes: number
//   seconds: number
//   total: number
// }

// export function isPromoActive(): boolean {
//   const now = new Date()
//   return now >= PROMO_CONFIG.startDate && now < PROMO_CONFIG.endDate
// }

// export function getTimeRemaining(): TimeRemaining {
//   const now = new Date()
//   const diff = PROMO_CONFIG.endDate.getTime() - now.getTime()
//   if (diff <= 0) {
//     return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
//   }
//   const days = Math.floor(diff / (1000 * 60 * 60 * 24))
//   const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
//   const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
//   const seconds = Math.floor((diff % (1000 * 60)) / 1000)
//   return { days, hours, minutes, seconds, total: diff }
// }

// export function calculateBonusCredits(amount: number): number {
//   return amount * (1 + PROMO_CONFIG.bonusPercent / 100)
// }

// export function getBonusAmount(amount: number): number {
//   return amount * (PROMO_CONFIG.bonusPercent / 100)
// }
// ============================================================

// TIER BONUS CONFIGURATION - Active
// 10% bonus for purchases >= $100
export const TIER_BONUS_CONFIG = {
  threshold: 100,
  bonusPercent: 10,
}

/**
 * Get tier bonus for a specific credit amount
 * @param credits - Amount of credits being purchased
 * @returns Bonus credits (10% for >= $100, 0 otherwise)
 */
export function getTierBonus(credits: number): number {
  if (credits >= TIER_BONUS_CONFIG.threshold) {
    return Math.floor(credits * TIER_BONUS_CONFIG.bonusPercent / 100)
  }
  return 0
}

/**
 * Calculate total credits including tier bonus
 * @param credits - Amount of credits being purchased
 * @returns Total credits after bonus
 */
export function calculateTotalWithTierBonus(credits: number): number {
  return credits + getTierBonus(credits)
}

/**
 * Check if a credit amount has a bonus tier
 * @param credits - Amount to check
 * @returns true if amount qualifies for bonus (>= $100)
 */
export function hasTierBonus(credits: number): boolean {
  return credits >= TIER_BONUS_CONFIG.threshold
}

// Legacy exports for compatibility (always return false/0 when promo disabled)
export function isPromoActive(): boolean {
  return false
}

export function getTimeRemaining() {
  return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
}

export function calculateBonusCredits(amount: number): number {
  return calculateTotalWithTierBonus(amount)
}

export function getBonusAmount(amount: number): number {
  return getTierBonus(amount)
}

export const PROMO_CONFIG = {
  bonusPercent: 0
}
