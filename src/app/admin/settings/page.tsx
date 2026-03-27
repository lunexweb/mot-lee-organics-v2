'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { 
  Settings, 
  Save,
  RefreshCw,
  DollarSign,
  Users,
  Mail,
  Phone,
  Building,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface CommissionRate {
  id: string
  level: number
  percentage: number
  is_active: boolean
}

interface SystemSettings {
  company_name: string
  company_email: string
  company_phone: string
  company_address: string
  website_url: string
  support_email: string
  commission_rates: CommissionRate[]
}

export default function SystemSettings() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [settings, setSettings] = useState<SystemSettings>({
    company_name: 'Mot-lee Organics',
    company_email: 'info@motleeorganics.com',
    company_phone: '+27 123 456 7890',
    company_address: '123 Organic Street, Cape Town, South Africa',
    website_url: 'https://motleeorganics.com',
    support_email: 'support@motleeorganics.com',
    commission_rates: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchSettings()
    }
  }, [userProfile])

  const fetchSettings = async () => {
    try {
      // Fetch commission rates
      const { data: commissionRates, error } = await supabase
        .from('commission_rates')
        .select('*')
        .order('level', { ascending: true })

      if (error) {
        console.error('Error fetching commission rates:', error)
        return
      }

      setSettings(prev => ({
        ...prev,
        commission_rates: commissionRates || []
      }))
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    setMessage('')

    try {
      // Update commission rates
      for (const rate of settings.commission_rates) {
        const { error } = await supabase
          .from('commission_rates')
          .update({
            percentage: rate.percentage,
            is_active: rate.is_active
          })
          .eq('id', rate.id)

        if (error) {
          console.error('Error updating commission rate:', error)
          setMessage('Error updating commission rates')
          setMessageType('error')
          return
        }
      }

      setMessage('Settings saved successfully!')
      setMessageType('success')
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage('Error saving settings')
      setMessageType('error')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleCommissionRateChange = (id: string, field: 'percentage' | 'is_active', value: number | boolean) => {
    setSettings(prev => ({
      ...prev,
      commission_rates: prev.commission_rates.map(rate =>
        rate.id === id ? { ...rate, [field]: value } : rate
      )
    }))
  }

  const resetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset commission rates to defaults?')) return

    try {
      const defaultRates = [
        { id: '', level: 1, percentage: 0.10, is_active: true },
        { id: '', level: 2, percentage: 0.05, is_active: true },
        { id: '', level: 3, percentage: 0.02, is_active: true }
      ]

      // Update each rate
      for (const rate of defaultRates) {
        const { error } = await supabase
          .from('commission_rates')
          .update({
            percentage: rate.percentage,
            is_active: rate.is_active
          })
          .eq('level', rate.level)

        if (error) {
          console.error('Error resetting commission rate:', error)
          return
        }
      }

      await fetchSettings()
      setMessage('Commission rates reset to defaults!')
      setMessageType('success')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error resetting settings:', error)
      setMessage('Error resetting settings')
      setMessageType('error')
    }
  }

  // Wait for auth AND profile to load before checking role
  if (authLoading || (user && !userProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Only show Access Denied when we KNOW user is not admin (profile loaded + role confirmed)
  if (user && userProfile && userProfile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Settings className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access system settings.</p>
          <Link href="/dashboard" className="btn-primary mt-4 inline-block">
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            <div className="flex items-center min-w-0 gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">ML</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 leading-none">Admin Panel</p>
                <h1 className="text-base font-semibold text-gray-900 leading-tight">System Settings</h1>
              </div>
            </div>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900 flex-shrink-0">← Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">

        {/* Message */}
        {message && (
          <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
            messageType === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {messageType === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message}
          </div>
        )}

        {/* Company Information */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Company Information</h3>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ['Company Name', 'text', 'company_name'],
              ['Company Email', 'email', 'company_email'],
              ['Company Phone', 'tel', 'company_phone'],
              ['Website URL', 'url', 'website_url'],
              ['Support Email', 'email', 'support_email'],
            ].map(([label, type, field]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                <input type={type} value={(settings as any)[field]}
                  onChange={(e) => setSettings(prev => ({ ...prev, [field]: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Company Address</label>
              <textarea value={settings.company_address}
                onChange={(e) => setSettings(prev => ({ ...prev, company_address: e.target.value }))}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
        </div>

        {/* Commission Rates */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Commission Rates</h3>
            <button onClick={resetToDefaults}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">
              <RefreshCw className="h-3.5 w-3.5" />Reset Defaults
            </button>
          </div>
          <div className="p-4 space-y-3">
            {settings.commission_rates.map((rate) => (
              <div key={rate.id} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      rate.level === 1 ? 'bg-green-500' : rate.level === 2 ? 'bg-blue-500' : 'bg-purple-500'
                    }`} />
                    <span className="text-sm font-semibold text-gray-900">Level {rate.level} Commission</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={rate.is_active}
                      onChange={(e) => handleCommissionRateChange(rate.id, 'is_active', e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
                    <span className="text-xs text-gray-600">Active</span>
                  </label>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">
                      {rate.level === 1 ? 'Direct (10% rec.)' : rate.level === 2 ? 'L2 (5% rec.)' : 'L3 (2% rec.)'}
                    </label>
                    <div className="relative">
                      <input type="number" step="0.01" min="0" max="1" value={rate.percentage}
                        onChange={(e) => handleCommissionRateChange(rate.id, 'percentage', parseFloat(e.target.value))}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 mb-1">Display</div>
                    <div className="text-lg font-bold text-gray-900">{(rate.percentage * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pb-4">
          <button onClick={handleSaveSettings} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50">
            {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Saving...</> : <><Save className="h-4 w-4" />Save Settings</>}
          </button>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
          <p className="text-xs text-gray-400">Built by <a href="https://www.lunexweb.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">lunexweb</a></p>
        </div>
      </footer>
    </div>
  )
}
