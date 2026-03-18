'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import {
  Wallet,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  User,
  Filter,
  AlertCircle,
  X
} from 'lucide-react'

interface Withdrawal {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_ibo_number: string
  amount: number
  fee: number
  net_amount: number
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  bank_name: string
  bank_account_number: string
  bank_account_holder: string
  branch_code: string
  admin_note: string
  created_at: string
  processed_at: string | null
}

export default function AdminWithdrawalsPage() {
  const { userProfile } = useAuth()
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<Withdrawal | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchWithdrawals()
    }
  }, [userProfile])

  const fetchWithdrawals = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          users!inner(name, email, ibo_number)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const transformed = (data || []).map((w: any) => ({
        id: w.id,
        user_id: w.user_id,
        user_name: w.users?.name || 'Unknown',
        user_email: w.users?.email || '',
        user_ibo_number: w.users?.ibo_number || '—',
        amount: w.amount,
        fee: w.fee,
        net_amount: w.net_amount,
        status: w.status,
        bank_name: w.bank_name || '—',
        bank_account_number: w.bank_account_number || '—',
        bank_account_holder: w.bank_account_holder || '—',
        branch_code: w.branch_code || '—',
        admin_note: w.admin_note || '',
        created_at: w.created_at,
        processed_at: w.processed_at
      }))

      setWithdrawals(transformed)
    } catch (err) {
      console.error('Error fetching withdrawals:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (withdrawal: Withdrawal) => {
    setProcessing(withdrawal.id)
    setError('')
    try {
      // Mark as approved — signals bank transfer is coming. Balance deducted only when marked as Paid.
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawal.id)

      if (withdrawalError) throw withdrawalError

      await fetchWithdrawals()
    } catch (err: any) {
      setError(err.message || 'Failed to approve withdrawal')
    } finally {
      setProcessing(null)
    }
  }

  const handleMarkAsPaid = async (withdrawal: Withdrawal) => {
    setProcessing(withdrawal.id)
    setError('')
    try {
      // Fetch current wallet balance
      const { data: walletData, error: walletFetchError } = await supabase
        .from('wallets')
        .select('balance, total_withdrawn')
        .eq('user_id', withdrawal.user_id)
        .eq('wallet_type', 'e_wallet')
        .single()

      if (walletFetchError || !walletData) throw new Error('Could not fetch member wallet')

      const newBalance = (walletData.balance || 0) - withdrawal.amount
      if (newBalance < 0) throw new Error('Insufficient wallet balance')

      // Deduct balance and update total_withdrawn
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance: newBalance,
          total_withdrawn: (walletData.total_withdrawn || 0) + withdrawal.amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', withdrawal.user_id)
        .eq('wallet_type', 'e_wallet')

      if (walletError) throw walletError

      // Verify the update actually applied (silent RLS failure = 0 rows updated)
      const { data: verifyWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', withdrawal.user_id)
        .eq('wallet_type', 'e_wallet')
        .single()

      if (!verifyWallet || Math.abs(verifyWallet.balance - newBalance) > 0.01) {
        throw new Error('Wallet update failed — check admin wallet permissions in Supabase RLS policies.')
      }

      // Mark withdrawal as paid
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawal.id)

      if (withdrawalError) throw withdrawalError

      // Log transaction
      await supabase.from('transactions').insert({
        user_id: withdrawal.user_id,
        amount: withdrawal.amount,
        transaction_type: 'debit',
        source_type: 'withdrawal',
        description: `Withdrawal paid. Fee: ${formatCurrency(withdrawal.fee)}, Net paid: ${formatCurrency(withdrawal.net_amount)}`
      })

      await fetchWithdrawals()
    } catch (err: any) {
      setError(err.message || 'Failed to mark withdrawal as paid')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    setProcessing(rejectTarget.id)
    setError('')
    try {
      // Restore available_for_withdrawal
      const { data: walletData, error: walletFetchError } = await supabase
        .from('wallets')
        .select('available_for_withdrawal')
        .eq('user_id', rejectTarget.user_id)
        .eq('wallet_type', 'e_wallet')
        .single()

      if (!walletFetchError && walletData) {
        await supabase
          .from('wallets')
          .update({
            available_for_withdrawal: (walletData.available_for_withdrawal || 0) + rejectTarget.amount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', rejectTarget.user_id)
          .eq('wallet_type', 'e_wallet')
      }

      // Mark withdrawal as rejected
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .update({
          status: 'rejected',
          admin_note: rejectNote,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', rejectTarget.id)

      if (withdrawalError) throw withdrawalError

      setRejectModalOpen(false)
      setRejectTarget(null)
      setRejectNote('')
      await fetchWithdrawals()
    } catch (err: any) {
      setError(err.message || 'Failed to reject withdrawal')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = withdrawals.filter(w => {
    const matchesSearch =
      w.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.user_ibo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.user_email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    pending: withdrawals.filter(w => w.status === 'pending').length,
    approved: withdrawals.filter(w => w.status === 'approved').length,
    paid: withdrawals.filter(w => w.status === 'paid').length,
    rejected: withdrawals.filter(w => w.status === 'rejected').length,
    pendingAmount: withdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + w.net_amount, 0),
    approvedAmount: withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.net_amount, 0),
    paidAmount: withdrawals.filter(w => w.status === 'paid').reduce((s, w) => s + w.net_amount, 0),
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'paid': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (userProfile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Admin access required.</p>
          <Link href="/dashboard" className="text-primary-600 underline mt-4 inline-block">Go to Dashboard</Link>
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
                <h1 className="text-base font-semibold text-gray-900 leading-tight">Withdrawal Requests</h1>
              </div>
            </div>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900 flex-shrink-0">← Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Pending', value: stats.pending },
            { icon: DollarSign, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Pending Amount', value: formatCurrency(stats.pendingAmount) },
            { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Approved (Paying)', value: stats.approved },
            { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Total Paid Out', value: formatCurrency(stats.paidAmount) },
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search by name, IBO number or email..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['pending', 'approved', 'paid', 'rejected', 'all'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors capitalize ${
                  statusFilter === s ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>{s}</button>
            ))}
          </div>
        </div>

        {/* Withdrawals Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Withdrawal Queue</h2>
            <p className="text-xs text-gray-500 mt-0.5">5% fee is taken from each withdrawal. Approve to trigger EFT to member's bank.</p>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <Wallet className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{searchTerm ? 'No matching withdrawals' : `No ${statusFilter === 'all' ? '' : statusFilter} withdrawals`}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Member', 'Requested', 'Fee (5%)', 'Net Payout', 'Bank Details', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{w.user_name}</div>
                        <div className="text-xs text-gray-500">{w.user_email}</div>
                        <div className="text-xs font-medium text-primary-600 mt-0.5">IBO: {w.user_ibo_number}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(w.amount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 font-medium">-{formatCurrency(w.fee)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-700">{formatCurrency(w.net_amount)}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-700">{w.bank_name}</div>
                        <div className="text-xs font-mono text-gray-900">{w.bank_account_number}</div>
                        <div className="text-xs text-gray-500">{w.bank_account_holder}</div>
                        <div className="text-xs text-gray-400">Branch: {w.branch_code}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${getStatusBadge(w.status)}`}>
                          {w.status === 'approved' ? 'Pending Payment' : w.status}
                        </span>
                        {w.admin_note && (
                          <div className="text-xs text-gray-400 mt-0.5 max-w-[120px] truncate" title={w.admin_note}>{w.admin_note}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {new Date(w.created_at).toLocaleDateString()}
                        {w.processed_at && (
                          <div className="text-xs text-gray-400">{new Date(w.processed_at).toLocaleDateString()}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {w.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(w)}
                              disabled={processing === w.id}
                              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold"
                            >
                              {processing === w.id ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => { setRejectTarget(w); setRejectModalOpen(true) }}
                              disabled={processing === w.id}
                              className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 font-semibold"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {w.status === 'approved' && (
                          <button
                            onClick={() => handleMarkAsPaid(w)}
                            disabled={processing === w.id}
                            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-semibold"
                          >
                            {processing === w.id ? '...' : 'Mark as Paid'}
                          </button>
                        )}
                        {w.status === 'paid' && (
                          <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" />Paid
                          </span>
                        )}
                        {w.status === 'rejected' && (
                          <span className="text-xs text-red-500 font-semibold flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" />Rejected
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {rejectModalOpen && rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Reject Withdrawal</h3>
              <button onClick={() => { setRejectModalOpen(false); setRejectTarget(null); setRejectNote('') }}
                className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p><span className="text-gray-500">Member:</span> <strong>{rejectTarget.user_name}</strong> ({rejectTarget.user_ibo_number})</p>
                <p><span className="text-gray-500">Amount:</span> <strong>{formatCurrency(rejectTarget.amount)}</strong></p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason for rejection (optional)</label>
                <textarea
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Incorrect bank details, insufficient activity..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <p className="text-xs text-gray-500">The requested amount will be restored to the member's available balance.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setRejectModalOpen(false); setRejectTarget(null); setRejectNote('') }}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleReject} disabled={processing === rejectTarget.id}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-semibold">
                  {processing === rejectTarget.id ? 'Rejecting...' : 'Reject Withdrawal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
          <p className="text-xs text-gray-400">Built by <a href="https://www.lunexweb.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">lunexweb</a></p>
        </div>
      </footer>
    </div>
  )
}
