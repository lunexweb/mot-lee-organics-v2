'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  DollarSign, 
  Search,
  Filter,
  CheckCircle,
  Clock,
  User,
  Calendar,
  TrendingUp,
  AlertCircle,
  Download,
  Eye,
  X
} from 'lucide-react'

interface Commission {
  id: string
  commission_amount: number
  level: number
  status: 'pending' | 'paid'
  created_at: string
  user_id: string
  user_name: string
  user_email: string
  user_ibo_number: string
  order_id: string
  order_number: string
  order_total: number
}

interface PayableRow {
  user_id: string
  name: string
  email: string
  ibo_number: string
  bank_name: string | null
  bank_account_number: string | null
  bank_branch_code: string | null
  bank_account_type: string | null
  bank_account_holder: string | null
  pending_count: number
  pending_total: number
  first_pending_at: string | null
  last_pending_at: string | null
}

export default function CommissionManagement() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [levelFilter, setLevelFilter] = useState<'all' | '1' | '2' | '3'>('all')
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<'pay' | 'none'>('none')
  const [groupByUser, setGroupByUser] = useState(false)
  const [payables, setPayables] = useState<PayableRow[]>([])
  const [payingUserId, setPayingUserId] = useState<string | null>(null)
  const [rateByLevel, setRateByLevel] = useState<Record<number, number>>({ 1: 0.10, 2: 0.05, 3: 0.02 })

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      // Load commission rates for dynamic labels
      supabase
        .from('commission_rates')
        .select('level, percentage, is_active')
        .order('level', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            const next: Record<number, number> = { 1: 0.10, 2: 0.05, 3: 0.02 }
            data.forEach(r => {
              if (r.is_active) next[r.level as 1|2|3] = Number(r.percentage)
            })
            setRateByLevel(next)
          }
        })

      if (groupByUser) {
        fetchPayables()
      } else {
        fetchCommissions()
      }
    }
  }, [userProfile, groupByUser])

  const fetchCommissions = async () => {
    try {
      const { data: commissionsData, error } = await supabase
        .from('commissions')
        .select(`
          id,
          commission_amount,
          level,
          status,
          created_at,
          user_id,
          order_id,
          users!inner(name, email, ibo_number),
          orders!inner(order_number, total_amount)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching commissions:', error)
        return
      }

      const transformedCommissions = (commissionsData || []).map((commission: any) => ({
        id: commission.id,
        commission_amount: commission.commission_amount,
        level: commission.level,
        status: commission.status,
        created_at: commission.created_at,
        user_id: commission.user_id,
        user_name: commission.users?.name || 'Unknown',
        user_email: commission.users?.email || 'Unknown',
        user_ibo_number: commission.users?.ibo_number || 'Unknown',
        order_id: commission.order_id,
        order_number: commission.orders?.order_number || 'Unknown',
        order_total: commission.orders?.total_amount || 0
      }))

      setCommissions(transformedCommissions)
    } catch (error) {
      console.error('Error fetching commissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPayables = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('v_admin_user_payables')
        .select('*')
        .order('pending_total', { ascending: false })

      if (error) {
        console.error('Error fetching payables:', error)
        setPayables([])
        return
      }
      setPayables((data as PayableRow[]) || [])
    } catch (error) {
      console.error('Error fetching payables:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePayAllForUser = async (userId: string) => {
    try {
      setPayingUserId(userId)
      const { error } = await supabase.rpc('pay_user_commissions', {
        p_user_id: userId,
        p_cutoff: new Date().toISOString(),
        p_note: 'Admin batch payout'
      })
      if (error) {
        console.error('Error paying commissions:', error)
        return
      }
      // refresh both lists cautiously
      if (groupByUser) {
        await fetchPayables()
      }
      await fetchCommissions()
    } catch (error) {
      console.error('Error paying commissions:', error)
    } finally {
      setPayingUserId(null)
    }
  }

  const handleUpdateCommissionStatus = async (commissionId: string, newStatus: 'pending' | 'paid') => {
    try {
      const { error } = await supabase
        .from('commissions')
        .update({ status: newStatus })
        .eq('id', commissionId)

      if (error) {
        console.error('Error updating commission status:', error)
        return
      }

      await fetchCommissions()
    } catch (error) {
      console.error('Error updating commission status:', error)
    }
  }

  const handleBulkAction = async () => {
    if (bulkAction === 'pay' && selectedCommissions.length > 0) {
      try {
        const { error } = await supabase
          .from('commissions')
          .update({ status: 'paid' })
          .in('id', selectedCommissions)

        if (error) {
          console.error('Error updating commission status:', error)
          return
        }

        await fetchCommissions()
        setSelectedCommissions([])
        setBulkAction('none')
      } catch (error) {
        console.error('Error updating commission status:', error)
      }
    }
  }

  const handleSelectCommission = (commissionId: string) => {
    setSelectedCommissions(prev => 
      prev.includes(commissionId) 
        ? prev.filter(id => id !== commissionId)
        : [...prev, commissionId]
    )
  }

  const handleSelectAll = () => {
    const filteredIds = filteredCommissions.map(c => c.id)
    setSelectedCommissions(
      selectedCommissions.length === filteredIds.length ? [] : filteredIds
    )
  }

  const filteredCommissions = commissions.filter(commission => {
    const matchesSearch = 
      commission.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.user_ibo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.order_number.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || commission.status === statusFilter
    const matchesLevel = levelFilter === 'all' || commission.level.toString() === levelFilter

    return matchesSearch && matchesStatus && matchesLevel
  })

  const getCommissionStats = () => {
    const totalCommissions = commissions.length
    const pendingCommissions = commissions.filter(c => c.status === 'pending').length
    const paidCommissions = commissions.filter(c => c.status === 'paid').length
    const totalPendingAmount = commissions
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + c.commission_amount, 0)
    const totalPaidAmount = commissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.commission_amount, 0)
    const level1Commissions = commissions.filter(c => c.level === 1).length
    const level2Commissions = commissions.filter(c => c.level === 2).length
    const level3Commissions = commissions.filter(c => c.level === 3).length

    return {
      totalCommissions,
      pendingCommissions,
      paidCommissions,
      totalPendingAmount,
      totalPaidAmount,
      level1Commissions,
      level2Commissions,
      level3Commissions
    }
  }

  const stats = getCommissionStats()

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'text-green-600 bg-green-100'
      case 2: return 'text-blue-600 bg-blue-100'
      case 3: return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
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
          <DollarSign className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access commission management.</p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            <div className="flex items-center min-w-0 gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">ML</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 leading-none">Admin Panel</p>
                <h1 className="text-base font-semibold text-gray-900 leading-tight">Commission Management</h1>
              </div>
            </div>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900 flex-shrink-0">← Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: DollarSign, color: 'text-primary-600', bg: 'bg-primary-50', label: 'Total', value: stats.totalCommissions },
            { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: `Pending (${formatCurrency(stats.totalPendingAmount)})`, value: stats.pendingCommissions },
            { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: `Paid (${formatCurrency(stats.totalPaidAmount)})`, value: stats.paidCommissions },
            { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Total Paid Out', value: formatCurrency(stats.totalPaidAmount) },
          ].map(({ icon: Icon, color, bg, label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}><Icon className={`h-4 w-4 ${color}`} /></div>
              <div className="min-w-0"><div className="text-xs text-gray-500 truncate">{label}</div><div className="text-sm font-bold text-gray-900 truncate">{value}</div></div>
            </div>
          ))}
        </div>

        {/* Level breakdown pills */}
        <div className="flex flex-wrap gap-2">
          {[['L1 Direct', stats.level1Commissions, 'bg-green-100 text-green-800', (rateByLevel[1]*100).toFixed(0)],
            ['L2 Second', stats.level2Commissions, 'bg-blue-100 text-blue-800', (rateByLevel[2]*100).toFixed(0)],
            ['L3 Third', stats.level3Commissions, 'bg-purple-100 text-purple-800', (rateByLevel[3]*100).toFixed(0)]
          ].map(([label, count, cls, rate]) => (
            <span key={label as string} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${cls as string}`}>
              {label as string} · {count as number} ({rate as string}%)
            </span>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search commissions..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 px-3 py-2 bg-white border border-gray-200 rounded-xl cursor-pointer">
            <input type="checkbox" checked={groupByUser} onChange={() => setGroupByUser(v => !v)} className="h-4 w-4" />
            Group by user
          </label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'paid')}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as 'all' | '1' | '2' | '3')}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
            <option value="all">All Levels</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
          </select>
        </div>

        {/* Bulk actions bar */}
        {selectedCommissions.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-blue-900">{selectedCommissions.length} selected</span>
            <div className="flex items-center gap-2">
              <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value as 'pay' | 'none')}
                className="text-sm border border-blue-300 rounded-xl px-3 py-1.5 focus:outline-none">
                <option value="none">Action</option>
                <option value="pay">Mark Paid</option>
              </select>
              <button onClick={handleBulkAction} disabled={bulkAction === 'none'}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">Apply</button>
              <button onClick={() => { setSelectedCommissions([]); setBulkAction('none') }}
                className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50">Clear</button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900">{groupByUser ? 'Grouped Payables' : 'Commission History'}</h3>
            <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">
              <Download className="h-3.5 w-3.5" />Export
            </button>
          </div>

          {groupByUser ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['User','Pending','Total','Bank','Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payables.map((p) => (
                    <tr key={p.user_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <a href={`/admin/users/${p.user_id}`} className="text-sm font-medium text-primary-700 hover:text-primary-900">{p.name}</a>
                        <div className="text-xs text-gray-500">{p.email}</div>
                        <div className="text-xs text-gray-400">{p.ibo_number}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{p.pending_count}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(p.pending_total)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{p.bank_name || '—'} {p.bank_account_number ? `· ${p.bank_account_number}` : ''}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handlePayAllForUser(p.user_id)} disabled={payingUserId === p.user_id}
                          className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50">
                          {payingUserId === p.user_id ? 'Paying…' : 'Pay All'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payables.length === 0 && <p className="text-xs text-gray-400 text-center py-8">No users with pending commissions</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">
                      <input type="checkbox"
                        checked={selectedCommissions.length === filteredCommissions.length && filteredCommissions.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
                    </th>
                    {['User','Order','Level','Amount','Status','Date','Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCommissions.map((commission) => (
                    <tr key={commission.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedCommissions.includes(commission.id)}
                          onChange={() => handleSelectCommission(commission.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{commission.user_name}</div>
                        <div className="text-xs text-gray-400">{commission.user_ibo_number}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{commission.order_number}</div>
                        <div className="text-xs text-gray-500">{formatCurrency(commission.order_total)}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getLevelColor(commission.level)}`}>L{commission.level}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(commission.commission_amount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          commission.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {commission.status === 'paid' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                          {commission.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{new Date(commission.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button onClick={() => handleUpdateCommissionStatus(commission.id, commission.status === 'paid' ? 'pending' : 'paid')}
                          className={`text-xs font-medium px-2 py-1 rounded-lg border transition-colors ${
                            commission.status === 'paid'
                              ? 'border-yellow-200 text-yellow-600 hover:bg-yellow-50'
                              : 'border-green-200 text-green-600 hover:bg-green-50'
                          }`}>
                          {commission.status === 'paid' ? 'Unmark' : 'Mark Paid'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCommissions.length === 0 && <p className="text-xs text-gray-400 text-center py-8">No commissions found</p>}
            </div>
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
