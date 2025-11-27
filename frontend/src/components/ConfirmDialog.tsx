'use client'

import Modal from './Modal'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  message: string
}

export default function ConfirmDialog({ isOpen, onClose, onConfirm, message }: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm">
      <div className="text-center">
        <p className="text-slate-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn btn-danger">
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  )
}
