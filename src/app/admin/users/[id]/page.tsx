'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { DollarSign, ArrowLeft } from 'lucide-react'

interface Profile {
  id: string
  name: string
  email: string
  phone: string | null
  ibo_number: string
  role: string
  status: string
  created_at?: string
  updated_at?: string
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_branch_code?: string | null
  bank_account_type?: string | null
  bank_account_holder?: string | null
  id_number?: string | null
  sponsor_id?: string | null
  sponsor_number?: string | null
  admin_number?: string | null
}

interface Stats {
  id: string
  orders_count: number
  orders_total: number
  commissions_count: number
  commissions_total: number
  commissions_pending_total: number
  commissions_paid_total: number
  level1_total: number
  level2_total: number
  level3_total: number
}

interface CommissionRow {
  commission_id: string
  earner_id: string
  order_id: string
  order_number: string
  order_total: number
  level: number
  status: 'pending' | 'paid'
  commission_amount: number
  created_at: string
  buyer_name?: string
  buyer_email?: string
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { userProfile } = useAuth()
  const userId = (params?.id as string) || ''

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [commissions, setCommissions] = useState<CommissionRow[]>([])
  const [sponsor, setSponsor] = useState<{ id: string; name: string; email: string; ibo_number: string } | null>(null)

  useEffect(() => {
    if (!userProfile) return
    if (userProfile.role !== 'admin') {
      router.replace('/dashboard')
      return
    }
    fetchAll()
  }, [userProfile, userId])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [{ data: p }, { data: s }, { data: c }] = await Promise.all([
        supabase.from('v_admin_user_profile').select('*').eq('id', userId).single(),
        supabase.from('v_admin_user_stats').select('*').eq('id', userId).single(),
        supabase
          .from('v_admin_user_commissions_detail')
          .select('*')
          .eq('earner_id', userId)
          .order('created_at', { ascending: false }),
      ])
      setProfile((p as any) || null)
      setStats((s as any) || null)
      setCommissions((c as any) || [])
      // fetch sponsor minimal info if present
      const sponsorId = (p as any)?.sponsor_id || null
      if (sponsorId) {
        const { data: sp } = await supabase
          .from('users')
          .select('id, name, email, ibo_number')
          .eq('id', sponsorId)
          .single()
        setSponsor((sp as any) || null)
      } else {
        setSponsor(null)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-3">User not found</p>
          <button onClick={() => router.back()} className="text-sm text-primary-600 hover:underline">← Go back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            <div className="flex items-center min-w-0 gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">ML</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 leading-none">Admin Panel</p>
                <h1 className="text-base font-semibold text-gray-900 leading-tight truncate">{profile.name}</h1>
              </div>
            </div>
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900 flex-shrink-0 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />Users
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">

        {/* Identity strip */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 font-bold text-sm">{profile.name?.charAt(0)?.toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-gray-900">{profile.name}</div>
            <div className="text-xs text-gray-500">{profile.email}{profile.phone ? ` · ${profile.phone}` : ''}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">IBO {profile.ibo_number}</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">{profile.role}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              profile.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            } capitalize`}>{profile.status}</span>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Orders', value: stats.orders_count, sub: formatCurrency(stats.orders_total) },
              { label: 'Pending', value: formatCurrency(stats.commissions_pending_total), sub: `${stats.commissions_count} commissions` },
              { label: 'Paid Out', value: formatCurrency(stats.commissions_paid_total), sub: null },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-sm font-bold text-gray-900">{value}</div>
                {sub && <div className="text-xs text-gray-400">{sub}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Profile details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { title: 'Address', rows: [
              ['Line 1', profile.address_line1],
              ['Line 2', profile.address_line2],
              ['City', profile.city],
              ['Province', profile.province],
              ['Postal Code', profile.postal_code],
              ['Country', profile.country],
            ]},
            { title: 'Bank', rows: [
              ['Bank', profile.bank_name],
              ['Holder', profile.bank_account_holder],
              ['Account #', profile.bank_account_number],
              ['Branch Code', profile.bank_branch_code],
              ['Account Type', profile.bank_account_type],
            ]},
            { title: 'Account', rows: [
              ['Created', profile.created_at ? new Date(profile.created_at).toLocaleDateString() : null],
              ['Updated', profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : null],
              ['Sponsor #', profile.sponsor_number],
              ['Admin #', profile.admin_number],
              ['ID Number', profile.id_number],
            ]},
            { title: 'Sponsor', rows: sponsor ? [
              ['Name', sponsor.name],
              ['Email', sponsor.email],
              ['IBO', sponsor.ibo_number],
            ] : [['Sponsor', null]] },
          ].map(({ title, rows }) => (
            <div key={title} className="bg-white rounded-xl border border-gray-200 p-3">
              <p className="text-xs font-bold text-gray-900 mb-2">{title}</p>
              <div className="space-y-1">
                {rows.map(([label, val]) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
                    {title === 'Sponsor' && label === 'Name' && sponsor ? (
                      <Link href={`/admin/users/${sponsor.id}`} className="text-xs font-medium text-primary-700 hover:underline truncate">{val || '—'}</Link>
                    ) : (
                      <span className="text-xs text-gray-700 font-medium text-right truncate">{val || '—'}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Commission history */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Commission History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Order','Buyer','Level','Amount','Status','Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {commissions.map((c) => (
                  <tr key={c.commission_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{c.order_number}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(c.order_total)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{c.buyer_name || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">L{c.level}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(c.commission_amount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium ${
                        c.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {commissions.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">No commission records found</p>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
          <p className="text-xs text-gray-400">Built by <a href="https://www.lunexweb.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">lunexweb</a></p>
        </div>
      </footer>
    </div>
  )
}


