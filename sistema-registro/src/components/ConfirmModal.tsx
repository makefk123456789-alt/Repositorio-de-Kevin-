'use client'

import { FiAlertCircle } from 'react-icons/fi'

interface ConfirmModalProps {
  open: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'warning' | 'danger' | 'info'
}

export default function ConfirmModal({
  open, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar',
  onConfirm, onCancel, type = 'warning',
}: ConfirmModalProps) {
  if (!open) return null

  const colors = {
    warning: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-500', btn: 'bg-orange-500 hover:bg-orange-600' },
    danger: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500', btn: 'bg-red-500 hover:bg-red-600' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', btn: 'bg-blue-500 hover:bg-blue-600' },
  }
  const c = colors[type]

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onCancel}>
      <div className={`bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 ${c.border} border-2`} onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full ${c.bg} flex items-center justify-center mb-4`}>
            <FiAlertCircle className={c.icon} size={32} />
          </div>
          {title && <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>}
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-3 px-4 ${c.btn} text-white rounded-xl text-sm font-bold transition-all active:scale-[0.97]`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
