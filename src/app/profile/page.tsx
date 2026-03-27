'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { SOUTH_AFRICAN_BANKS } from '@/lib/config'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, PartyPopper, X } from 'lucide-react'

type ProfileForm = {
  address_line1: string
  address_line2: string
  city: string
  province: string
  postal_code: string
  country: string
  bank_name: string
  bank_account_number: string
  bank_branch_code: string
  bank_account_type: string
  bank_account_holder: string
  id_number: string
}

export default function ProfilePage() {
  const { userProfile, refreshProfile, loading: authLoading } = useAuth()
  const [form, setForm] = useState<ProfileForm>({
    address_line1: '',
    address_line2: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'South Africa',
    bank_name: '',
    bank_account_number: '',
    bank_branch_code: '',
    bank_account_type: '',
    bank_account_holder: '',
    id_number: ''
  })
  const [saving, setSaving] = useState(false)
  const [formLoading, setFormLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    if (!userProfile) {
      setFormLoading(false)
      return
    }
    // Populate form with existing user data
    setForm({
      address_line1: userProfile.address_line1 || '',
      address_line2: userProfile.address_line2 || '',
      city: userProfile.city || '',
      province: userProfile.province || '',
      postal_code: userProfile.postal_code || '',
      country: userProfile.country || 'South Africa',
      bank_name: userProfile.bank_name || '',
      bank_account_number: userProfile.bank_account_number || '',
      bank_branch_code: userProfile.bank_branch_code || '',
      bank_account_type: userProfile.bank_account_type || '',
      bank_account_holder: userProfile.bank_account_holder || userProfile.name || '',
      id_number: userProfile.id_number || ''
    })
    setFormLoading(false)
  }, [userProfile])

  const handleChange = (field: keyof ProfileForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) return
    setSaving(true)
    setError('')
    setShowSuccessModal(false)
    try {
      const { error: upErr } = await supabase
        .from('users')
        .update({
          address_line1: form.address_line1 || null,
          address_line2: form.address_line2 || null,
          city: form.city || null,
          province: form.province || null,
          postal_code: form.postal_code || null,
          country: form.country || null,
          bank_name: form.bank_name || null,
          bank_account_number: form.bank_account_number || null,
          bank_branch_code: form.bank_branch_code || null,
          bank_account_type: form.bank_account_type || null,
          bank_account_holder: form.bank_account_holder || null,
          id_number: form.id_number || null,
        })
        .eq('id', userProfile.id)

      if (upErr) throw upErr
      
      // Show celebratory modal
      setShowSuccessModal(true)
      
      // Refresh profile in background (don't block UI)
      refreshProfile().catch(err => console.error('Error refreshing profile:', err))
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || formLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full card text-center">
          <p className="text-gray-700 mb-4">Please sign in to manage your profile.</p>
          <Link href="/login" className="btn-primary">Go to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            <div className="flex items-center min-w-0 gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">ML</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 leading-none">Member Portal</p>
                <h1 className="text-base font-semibold text-gray-900 leading-tight">My Profile</h1>
              </div>
            </div>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 flex-shrink-0">← Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5">

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowSuccessModal(false)}
            />
            
            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-scale-in">
                {/* Close button */}
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Content */}
                <div className="p-8 text-center">
                  {/* Animated checkmark circle */}
                  <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6 animate-scale-in-delay">
                    <CheckCircle2 className="h-12 w-12 text-green-600" strokeWidth={2} />
                  </div>

                  {/* Party popper emoji/animation */}
                  <div className="mb-4">
                    <PartyPopper className="h-16 w-16 text-yellow-400 mx-auto animate-bounce" />
                  </div>

                  {/* Success message */}
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    Profile Saved!
                  </h2>
                  <p className="text-lg text-gray-600 mb-6">
                    Your information has been successfully updated and saved to our database.
                  </p>
                  <p className="text-sm text-gray-500 mb-8">
                    You can now receive commissions and orders with your complete profile.
                  </p>

                  {/* Action button */}
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full btn-primary py-3 text-lg font-semibold"
                  >
                    Awesome!
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: 'Street address', field: 'address_line1' as const },
                { label: 'Address line 2', field: 'address_line2' as const },
                { label: 'City', field: 'city' as const },
                { label: 'Province', field: 'province' as const },
                { label: 'Postal code', field: 'postal_code' as const },
                { label: 'Country', field: 'country' as const },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form[field]} onChange={e => handleChange(field, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Bank Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Bank name</label>
                <select className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.bank_name} onChange={e => {
                    handleChange('bank_name', e.target.value)
                    const selected = SOUTH_AFRICAN_BANKS.find(b => b.name === e.target.value)
                    if (selected) handleChange('bank_branch_code', selected.universalBranchCode)
                  }}>
                  <option value="">Select a bank</option>
                  {SOUTH_AFRICAN_BANKS.map(bank => <option key={bank.name} value={bank.name}>{bank.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Account holder</label>
                <input className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.bank_account_holder} onChange={e => handleChange('bank_account_holder', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Account number</label>
                <input className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.bank_account_number} onChange={e => handleChange('bank_account_number', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Account type</label>
                <select className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.bank_account_type} onChange={e => handleChange('bank_account_type', e.target.value)}>
                  <option value="">Select account type</option>
                  {['Current','Savings','Student','Transmission','Investment','Business','Money Market','Fixed Deposit','Cheque','Premium','Gold','Platinum','Business Current','Business Savings'].map(t => (
                    <option key={t} value={t}>{t} Account</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Branch code</label>
                <input className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.bank_branch_code} onChange={e => handleChange('bank_branch_code', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Verification</h2>
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-gray-700 mb-1">ID number</label>
              <input className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.id_number} onChange={e => handleChange('id_number', e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end items-center gap-3 pb-6">
            {saving && (
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-600" />Saving...
              </span>
            )}
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}


