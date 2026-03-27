'use client'

import React from 'react'

interface AlertModalProps {
  open: boolean
  title?: string
  message: string
  onClose: () => void
  confirmText?: string
}

export function AlertModal({ open, title = 'Notice', message, onClose, confirmText = 'OK' }: AlertModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg max-w-sm w-full mx-4 p-5">
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>}
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{message}</p>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="btn-primary px-4 py-2 text-sm">{confirmText}</button>
        </div>
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  open: boolean
  title?: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
}

export function ConfirmModal({ open, title = 'Confirm', message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' }: ConfirmModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-lg max-w-sm w-full mx-4 p-5">
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>}
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary px-4 py-2 text-sm">{cancelText}</button>
          <button onClick={onConfirm} className="btn-primary px-4 py-2 text-sm">{confirmText}</button>
        </div>
      </div>
    </div>
  )
}


