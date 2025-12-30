// ============================================================
// PROMO CONFIGURATION - ENABLED
// ============================================================
export const PROMO_CONFIG = {
  startDate: new Date('2026-01-01T00:00:00+07:00'),
  endDate: new Date('2026-01-03T00:00:00+07:00'),
  bonusPercent: 20,
}

export interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
}

export function isPromoActive(): boolean {
  const now = new Date()
  return now >= PROMO_CONFIG.startDate && now < PROMO_CONFIG.endDate
}

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

export function calculateBonusCredits(amount: number): number {
  return amount * (1 + PROMO_CONFIG.bonusPercent / 100)
}

export function getBonusAmount(amount: number): number {
  return amount * (PROMO_CONFIG.bonusPercent / 100)
}
