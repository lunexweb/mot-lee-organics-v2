'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Filter,
  Download,
  Clock, 
  CheckCircle,
  AlertCircle,
  Users,
  Wallet,
  XCircle
} from 'lucide-react'

interface Commission {
  id: string
  commission_amount: number
  level: number
  status: 'pending' | 'paid'
  created_at: string
  order_id: string
  order_number?: string
  customer_name?: string
}

interface EarningsSummary {
  totalEarnings: number
  pendingEarnings: number
  paidEarnings: number
  level1Earnings: number
  level2Earnings: number
  level3Earnings: number
}

interface Withdrawal {
  id: string
  amount: number
  fee: number
  net_amount: number
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  bank_name: string
  bank_account_number: string
  admin_note: string
  created_at: string
  processed_at: string | null
}

export default function EarningsPage() {
  const { userProfile } = useAuth()
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [showRankingInfo, setShowRankingInfo] = useState(false)
  const [summary, setSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    level1Earnings: 0,
    level2Earnings: 0,
    level3Earnings: 0,
  })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [levelFilter, setLevelFilter] = useState<'all' | '1' | '2' | '3'>('all')
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])

  useEffect(() => {
    if (userProfile) {
      fetchEarnings()
      fetchWithdrawals()
    }
  }, [userProfile])

  const fetchEarnings = async () => {
    if (!userProfile) return
    
    try {
      // Get all commissions for the user
      const { data: commissionsData, error } = await supabase
        .from('commissions')
        .select(`
          id,
          commission_amount,
          level,
          status,
          created_at,
          order_id,
          orders(
            order_number,
            users(name)
          )
        `)
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching commissions:', error)
        setCommissions([])
        setLoading(false)
        return
      }

      // If no commissions, show empty state immediately
      if (!commissionsData || commissionsData.length === 0) {
        setCommissions([])
        setSummary({
          totalEarnings: 0,
          pendingEarnings: 0,
          paidEarnings: 0,
          level1Earnings: 0,
          level2Earnings: 0,
          level3Earnings: 0,
        })
        setLoading(false)
        return
      }

      // Transform the data
      const transformedCommissions = commissionsData.map((commission: any) => ({
        id: commission.id,
        commission_amount: commission.commission_amount,
        level: commission.level,
        status: commission.status,
        created_at: commission.created_at,
        order_id: commission.order_id,
        order_number: commission.orders?.order_number,
        customer_name: commission.orders?.users?.name,
      }))

      setCommissions(transformedCommissions)

      // Calculate summary
      const summaryData = transformedCommissions.reduce((acc, commission) => {
        acc.totalEarnings += commission.commission_amount
        
        if (commission.status === 'pending') {
          acc.pendingEarnings += commission.commission_amount
      } else {
          acc.paidEarnings += commission.commission_amount
        }

        if (commission.level === 1) {
          acc.level1Earnings += commission.commission_amount
        } else if (commission.level === 2) {
          acc.level2Earnings += commission.commission_amount
        } else if (commission.level === 3) {
          acc.level3Earnings += commission.commission_amount
        }

        return acc
      }, {
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
        level1Earnings: 0,
        level2Earnings: 0,
        level3Earnings: 0,
      })

      setSummary(summaryData)
    } catch (error) {
      console.error('Error fetching earnings:', error)
      setCommissions([])
    } finally {
      setLoading(false)
    }
  }

  const fetchWithdrawals = async () => {
    if (!userProfile) return
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })
      if (!error) setWithdrawals(data || [])
    } catch {}
  }

  const filteredCommissions = commissions.filter(commission => {
    const statusMatch = statusFilter === 'all' || commission.status === statusFilter
    const levelMatch = levelFilter === 'all' || commission.level.toString() === levelFilter
    return statusMatch && levelMatch
  })

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'text-green-600 bg-green-100'
      case 2: return 'text-blue-600 bg-blue-100'
      case 3: return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
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
                <h1 className="text-base font-semibold text-gray-900 leading-tight">Earnings</h1>
              </div>
            </div>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 flex-shrink-0">← Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50', label: 'Total', value: formatCurrency(summary.totalEarnings) },
            { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Paid', value: formatCurrency(summary.paidEarnings) },
            { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Pending', value: formatCurrency(summary.pendingEarnings) },
            { icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Commissions', value: commissions.length },
          ].map(({ icon: Icon, color, bg, label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-sm font-bold text-gray-900 truncate">{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Level breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Level Breakdown</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'L1', sub: '10%', value: summary.level1Earnings, dot: 'bg-green-500' },
              { label: 'L2', sub: '5%', value: summary.level2Earnings, dot: 'bg-blue-500' },
              { label: 'L3', sub: '2%', value: summary.level3Earnings, dot: 'bg-purple-500' },
            ].map(({ label, sub, value, dot }) => (
              <div key={label} className="bg-gray-50 rounded-xl border border-gray-100 p-3 overflow-hidden">
                <div className="flex items-center gap-1.5 mb-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                  <span className="text-xs font-medium text-gray-700">{label}</span>
                  <span className="text-xs text-gray-400">{sub}</span>
                </div>
                <div className="text-sm font-bold text-gray-900 truncate">{formatCurrency(value)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">How commissions work</h3>
              <p className="text-xs text-gray-500 mt-0.5">Understand your earnings structure</p>
            </div>
            <button type="button" onClick={() => setShowRankingInfo(v => !v)}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex-shrink-0">
              {showRankingInfo ? 'Hide' : 'Show'}
            </button>
          </div>
          {showRankingInfo && (
            <div className="mt-3 space-y-2 text-xs text-gray-700 border-t border-gray-100 pt-3">
              <p><span className="font-medium">Level 1</span>: Direct referrals — 10% on their orders.</p>
              <p><span className="font-medium">Level 2</span>: Referral's referrals — 5% on their orders.</p>
              <p><span className="font-medium">Level 3</span>: Third-line referrals — 2% on their orders.</p>
              <p className="text-gray-500">Commissions are generated after payment is received. Keep your profile complete to receive payouts.</p>
            </div>
          )}
        </div>

        {/* Filters + table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Commission History</h3>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as any)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50">
                <option value="all">All Levels</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
              </select>
            </div>
          </div>

          {filteredCommissions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900">{commissions.length === 0 ? 'No commissions yet' : 'No matches'}</p>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                {commissions.length === 0 ? 'Build your team to start earning commissions.' : 'Try changing your filters.'}
              </p>
              {commissions.length === 0 && (
                <Link href="/team" className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 transition-colors">
                  <Users className="h-4 w-4" />Build Your Team
                </Link>
              )}
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
                {['Order', 'Customer', 'Level', 'Amount', 'Status'].map(h => (
                  <div key={h} className="text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</div>
                ))}
              </div>
              {filteredCommissions.map((commission) => (
                <div key={commission.id} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 items-center px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <div className="text-sm text-gray-900 truncate">{commission.order_number || 'N/A'}</div>
                  <div className="text-sm text-gray-700 truncate">{commission.customer_name || 'N/A'}</div>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getLevelColor(commission.level)}`}>L{commission.level}</span>
                  <div className="text-sm font-bold text-gray-900">{formatCurrency(commission.commission_amount)}</div>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(commission.status)}
                    <span className={`text-xs font-medium capitalize ${commission.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>{commission.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Withdrawal History */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-gray-900">Withdrawal History</h3>
            </div>
            <span className="text-xs text-gray-400">5% fee applied per withdrawal</span>
          </div>
          {withdrawals.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No withdrawals yet</p>
              <p className="text-xs text-gray-400 mt-1">Use the Withdraw button on your dashboard to request a payout.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {withdrawals.map(w => (
                <div key={w.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">{new Date(w.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div className="text-xs text-gray-500">{w.bank_name} · {w.bank_account_number}</div>
                    {w.admin_note && <div className="text-xs text-red-500 mt-0.5">{w.admin_note}</div>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(w.amount)}</div>
                      <div className="text-xs text-gray-400">Net: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(w.net_amount)}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                      w.status === 'paid' ? 'bg-green-100 text-green-800' :
                      w.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      w.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {w.status === 'paid' && <CheckCircle className="h-3 w-3" />}
                      {w.status === 'approved' && <Clock className="h-3 w-3" />}
                      {w.status === 'rejected' && <XCircle className="h-3 w-3" />}
                      {w.status === 'pending' && <Clock className="h-3 w-3" />}
                      {w.status === 'approved' ? 'Pending Payment' : w.status}
                    </span>
                  </div>
                </div>
              ))}
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
