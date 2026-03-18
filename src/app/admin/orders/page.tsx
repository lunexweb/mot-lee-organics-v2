'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ConfirmModal } from '@/components/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  ShoppingCart, 
  Search,
  Filter,
  Eye,
  CheckCircle,
  Clock,
  Truck,
  Package,
  User,
  Calendar,
  DollarSign,
  AlertCircle,
  X
} from 'lucide-react'

interface Order {
  id: string
  order_number: string
  total_amount: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  created_at: string
  updated_at: string
  user_id: string
  user_name: string
  user_email: string
  user_ibo_number: string
  shipping_address: any
  items: OrderItem[]
}

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-800' },
  { value: 'shipped', label: 'Shipped', color: 'bg-purple-100 text-purple-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
]

export default function OrderManagement() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchOrders()
    }
  }, [userProfile])

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          status,
          created_at,
          updated_at,
          user_id,
          shipping_address,
          users!inner(name, email, ibo_number),
          order_items!inner(
            id,
            quantity,
            unit_price,
            total_price,
            products!inner(name)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
        return
      }

      const transformedOrders = (ordersData || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.created_at,
        updated_at: order.updated_at,
        user_id: order.user_id,
        user_name: order.users?.name || 'Unknown',
        user_email: order.users?.email || 'Unknown',
        user_ibo_number: order.users?.ibo_number || '—',
        shipping_address: order.shipping_address,
        items: order.order_items?.map((item: any) => ({
          id: item.id,
          product_name: item.products?.name || 'Unknown Product',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        })) || []
      }))

      setOrders(transformedOrders)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      if (newStatus === 'processing') {
        // Use confirm_payment RPC so commissions and wallet credits are triggered
        const { error } = await supabase.rpc('confirm_payment', { p_order_id: orderId })
        if (error) {
          console.error('Error confirming payment:', error)
          return
        }
      } else {
        const { error } = await supabase
          .from('orders')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)

        if (error) {
          console.error('Error updating order status:', error)
          return
        }
      }

      await fetchOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'processing':
        return <Package className="h-4 w-4 text-blue-500" />
      case 'shipped':
        return <Truck className="h-4 w-4 text-purple-500" />
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user_ibo_number.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getOrderStats = () => {
    const totalOrders = orders.length
    const pendingOrders = orders.filter(o => o.status === 'pending').length
    const processingOrders = orders.filter(o => o.status === 'processing').length
    const shippedOrders = orders.filter(o => o.status === 'shipped').length
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length
    const totalRevenue = orders
      .filter(o => o.status === 'processing' || o.status === 'shipped' || o.status === 'delivered')
      .reduce((sum, o) => sum + o.total_amount, 0)

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      totalRevenue
    }
  }

  const stats = getOrderStats()

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
          <ShoppingCart className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access order management.</p>
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
                <h1 className="text-base font-semibold text-gray-900 leading-tight">Order Management</h1>
              </div>
            </div>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900 flex-shrink-0">← Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { icon: ShoppingCart, color: 'text-primary-600', bg: 'bg-primary-50', label: 'Total', value: stats.totalOrders },
            { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Pending', value: stats.pendingOrders },
            { icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Processing', value: stats.processingOrders },
            { icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Shipped', value: stats.shippedOrders },
            { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Delivered', value: stats.deliveredOrders },
            { icon: DollarSign, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Revenue', value: formatCurrency(stats.totalRevenue) },
          ].map(({ icon: Icon, color, bg, label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col items-start gap-1">
              <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}><Icon className={`h-3.5 w-3.5 ${color}`} /></div>
              <div className="text-xs text-gray-500">{label}</div>
              <div className="text-sm font-bold text-gray-900 truncate w-full">{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search by order #, name, email or IBO number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['all','pending','processing'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  statusFilter === s ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>{s === 'all' ? 'All' : s === 'pending' ? 'Pending' : 'Processing (Paid)'}</button>
            ))}
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
              <option value="all">All Status</option>
              {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Order','Customer','Amount','Status','Date','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                      <div className="text-xs text-gray-500">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</div>
                      <div className="text-xs font-medium text-primary-600">IBO: {order.user_ibo_number}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.user_name}</div>
                      <div className="text-xs text-gray-500">{order.user_email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(order.total_amount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(order.status)}
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          ORDER_STATUSES.find(s => s.value === order.status)?.color || 'bg-gray-100 text-gray-800'
                        }`}>{ORDER_STATUSES.find(s => s.value === order.status)?.label || order.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <a href={`/orders/${order.id}`} className="text-primary-600 hover:text-primary-900" title="View invoice">
                          <Eye className="h-3.5 w-3.5" />
                        </a>
                        {order.status === 'pending' && (
                          <button onClick={() => { setConfirmOrderId(order.id); setConfirmOpen(true) }}
                            className="text-xs text-green-600 hover:text-green-800 font-medium border border-green-200 rounded-lg px-2 py-1">Mark Paid</button>
                        )}
                        <select value={order.status} onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white">
                          {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredOrders.length === 0 && (
            <div className="text-center py-10">
              <ShoppingCart className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No orders found</p>
            </div>
          )}
        </div>
      </main>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Order Details</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Order Number</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedOrder.order_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Total Amount</label>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedOrder.total_amount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      ORDER_STATUSES.find(s => s.value === selectedOrder.status)?.color || 'bg-gray-100 text-gray-800'
                    }`}>
                      {ORDER_STATUSES.find(s => s.value === selectedOrder.status)?.label || selectedOrder.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Order Date</label>
                    <p className="text-sm text-gray-900">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* Customer Info */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Customer Information</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-900"><strong>Name:</strong> {selectedOrder.user_name}</p>
                    <p className="text-sm text-gray-900"><strong>Email:</strong> {selectedOrder.user_email}</p>
                    {selectedOrder.shipping_address && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-600">Shipping Address:</p>
                        <p className="text-sm text-gray-900">{JSON.stringify(selectedOrder.shipping_address, null, 2)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Order Items</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedOrder.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                            <td className="px-4 py-2 text-sm font-semibold text-gray-900">{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Confirm Payment"
        message="Mark that the order has been paid?"
        onCancel={() => { setConfirmOpen(false); setConfirmOrderId(null) }}
        onConfirm={() => {
          if (confirmOrderId) {
            handleUpdateOrderStatus(confirmOrderId, 'processing')
          }
          setConfirmOpen(false)
          setConfirmOrderId(null)
        }}
        confirmText="Mark as Paid"
        cancelText="Cancel"
      />

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
          <p className="text-xs text-gray-400">Built by <a href="https://www.lunexweb.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">lunexweb</a></p>
        </div>
      </footer>
    </div>
  )
}
