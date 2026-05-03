'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  DollarSign, 
  CheckCircle, 
  Clock, 
  Search,
  Filter,
  User,
  ArrowLeft
} from 'lucide-react'

interface Payment {
  id: string
  order_number: string
  user_id: string
  user_name: string
  user_ibo: string
  total_amount: number
  payment_status: string
  status: string
  created_at: string
}

export default function AdminPaymentsPage() {
  const { userProfile } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchPayments()
    }
  }, [userProfile])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          users!inner (
            name,
            ibo_number
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedPayments = data.map(order => ({
        id: order.id,
        order_number: order.order_number,
        user_id: order.user_id,
        user_name: order.users?.name || 'Unknown',
        user_ibo: order.users?.ibo_number || 'N/A',
        total_amount: order.total_amount,
        payment_status: order.payment_status,
        status: order.status,
        created_at: order.created_at
      }))

      setPayments(formattedPayments)
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const confirmPayment = async (orderId: string) => {
    setUpdating(orderId)
    try {
      // Call the confirm_payment function
      const { error } = await supabase.rpc('confirm_payment', { p_order_id: orderId })
      
      if (error) throw error

      // Refresh the payments list
      await fetchPayments()
    } catch (error) {
      console.error('Error confirming payment:', error)
      alert('Failed to confirm payment. Please try again.')
    } finally {
      setUpdating(null)
    }
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_ibo.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || payment.payment_status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'shipped':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Clock className="h-4 w-4" />
      case 'paid':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (userProfile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
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
                <h1 className="text-base font-semibold text-gray-900 leading-tight">Payment Management</h1>
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
            { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Pending', value: payments.filter(p => p.payment_status === 'pending_payment').length },
            { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Confirmed', value: payments.filter(p => p.payment_status === 'paid').length },
            { icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Revenue', value: formatCurrency(payments.filter(p => p.payment_status === 'paid').reduce((s, p) => s + p.total_amount, 0)) },
            { icon: User, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Pending Rev.', value: formatCurrency(payments.filter(p => p.payment_status === 'pending_payment').reduce((s, p) => s + p.total_amount, 0)) },
          ].map(({ icon: Icon, color, bg, label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}><Icon className={`h-4 w-4 ${color}`} /></div>
              <div className="min-w-0"><div className="text-xs text-gray-500">{label}</div><div className="text-sm font-bold text-gray-900 truncate">{value}</div></div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search by order, name, or IBO..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
            <option value="all">All Payments</option>
            <option value="pending_payment">Pending</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Payment Queue</h2>
            <p className="text-xs text-gray-500 mt-0.5">Click "Confirm" when you see the payment in your bank statement.</p>
          </div>
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-10">
              <DollarSign className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{searchTerm || filterStatus !== 'all' ? 'No matching payments' : 'No payments yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Order','Customer','IBO','Amount','Status','Date','Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{payment.order_number}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{payment.user_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded-lg">{payment.user_ibo}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(payment.total_amount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(payment.payment_status)}`}>
                          {getStatusIcon(payment.payment_status)}
                          {payment.payment_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {payment.payment_status === 'pending_payment' ? (
                          <button onClick={() => confirmPayment(payment.id)} disabled={updating === payment.id}
                            className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-semibold">
                            {updating === payment.id ? 'Confirming...' : 'Confirm'}
                          </button>
                        ) : (
                          <span className="text-xs text-green-600 font-semibold">✓ Confirmed</span>
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

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
          <p className="text-xs text-gray-400">Built by <a href="https://www.lunexweb.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">lunexweb</a></p>
        </div>
      </footer>
    </div>
  )
}
