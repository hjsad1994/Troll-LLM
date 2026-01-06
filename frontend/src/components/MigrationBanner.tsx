'use client'

import { useState } from 'react'
import { useLanguage } from '@/components/LanguageProvider'

interface MigrationBannerProps {
  currentCredits: number
  onMigrate: () => Promise<void>
}

export default function MigrationBanner({
  currentCredits,
  onMigrate
}: MigrationBannerProps) {
  const { t } = useLanguage()
  const [showModal, setShowModal] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)

  const newCredits = currentCredits / 2.5

  const handleMigrateClick = () => {
    setShowModal(true)
  }

  const handleRefundClick = () => {
    // Open Discord in new tab
    window.open('https://discord.gg/6zKhvaQve4', '_blank')
  }

  const handleConfirmMigration = async () => {
    setIsMigrating(true)
    try {
      await onMigrate()
      setShowModal(false)
    } catch (error) {
      console.error('Migration failed:', error)
      alert(error instanceof Error ? error.message : 'Migration failed')
    } finally {
      setIsMigrating(false)
    }
  }

  return (
    <>
      <div
        role="alert"
        aria-live="assertive"
        className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-3"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Info icon */}
            <span className="text-amber-600 dark:text-amber-400 text-lg" aria-hidden="true">
              ℹ️
            </span>

            {/* Message */}
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-medium">
                {t.migration?.title || 'Rate Update Required'}
              </span>
              {' '}{t.migration?.description || 'We are updating our billing rate. Please choose to migrate your credits or request a refund.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Refund button */}
            <button
              onClick={handleRefundClick}
              className="px-4 py-1.5 border border-amber-600 dark:border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900 text-sm font-medium rounded-md transition-colors"
            >
              {t.migration?.requestRefund || 'Request Refund'}
            </button>

            {/* Migrate button */}
            <button
              onClick={handleMigrateClick}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              {t.migration?.migrateCredits || 'Migrate Credits'}
            </button>
          </div>
        </div>
      </div>

      {/* Migration Confirmation Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="migration-modal-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2
              id="migration-modal-title"
              className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
            >
              {t.migration?.modalTitle || 'Confirm Migration'}
            </h2>

            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.migration?.modalDescription || 'Your credits will be converted to the new rate. This action cannot be undone.'}
              </p>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t.migration?.oldRate || 'Old Rate'} (1,000 VNĐ/$):
                  </span>
                  <span className="font-mono font-medium text-gray-900 dark:text-white">
                    ${currentCredits.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t.migration?.newRate || 'New Rate'} (2,500 VNĐ/$):
                  </span>
                  <span className="font-mono font-medium text-green-600 dark:text-green-400">
                    ${newCredits.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {t.migration?.difference || 'Difference'}:
                    </span>
                    <span className="font-mono font-medium text-red-600 dark:text-red-400">
                      -${(currentCredits - newCredits).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ {t.migration?.warning || 'This action is irreversible. Please confirm you understand your credits will be reduced.'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isMigrating}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
              >
                {t.migration?.cancel || 'Cancel'}
              </button>

              <button
                onClick={handleConfirmMigration}
                disabled={isMigrating}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMigrating
                  ? (t.migration?.migrating || 'Migrating...')
                  : (t.migration?.confirm || 'Confirm Migration')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
