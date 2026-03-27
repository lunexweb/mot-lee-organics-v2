'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  Package, 
  ShoppingCart, 
  ArrowLeft,
  LogOut,
  Calendar,
  Filter,
  Eye,
  Truck,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import { COMPANY_EFT_DETAILS } from '@/lib/config'

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  product: {
    name: string
    description: string
    image_url: string | null
  }
}

interface Order {
  id: string
  order_number: string
  total_amount: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  shipping_address: any
  created_at: string
  updated_at: string
  order_items: OrderItem[]
}

export default function OrdersPage() {
  const { userProfile, signOut } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    if (userProfile) {
      fetchOrders()
    }
  }, [userProfile, filter])

  const fetchOrders = async () => {
    if (!userProfile) return
    
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (
              name,
              description,
              image_url
            )
          )
        `)
        .eq('user_id', userProfile.id)

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
      } else {
        setOrders(data || [])
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'processing':
        return <Package className="h-4 w-4 text-blue-600" />
      case 'shipped':
        return <Truck className="h-4 w-4 text-purple-600" />
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'shipped':
        return 'bg-purple-100 text-purple-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTotalOrders = () => orders.length
  const getTotalSpent = () =>
    orders
      .filter(o => o.status === 'delivered')
      .reduce((total, o) => total + o.total_amount, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
                <h1 className="text-base font-semibold text-gray-900 leading-tight">Orders</h1>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">← Dashboard</Link>
              <button onClick={handleSignOut} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
                <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: ShoppingCart, color: 'text-primary-600', bg: 'bg-primary-50', label: 'Total Orders', value: getTotalOrders() },
            { icon: Package, color: 'text-green-600', bg: 'bg-green-50', label: 'Total Spent', value: formatCurrency(getTotalSpent()) },
            { icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', label: 'This Month', value: orders.filter(o => {
              const d = new Date(o.created_at); const n = new Date();
              return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
            }).length },
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

        {/* Support notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-blue-900 mb-0.5">Need help or sending Proof of Payment?</p>
          <p className="text-xs text-blue-800">Email: {COMPANY_EFT_DETAILS.salesEmail} &nbsp;·&nbsp; WhatsApp: {COMPANY_EFT_DETAILS.whatsapp}</p>
        </div>

        {/* Orders list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Your Orders</h3>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900">No orders yet</p>
              <p className="text-xs text-gray-500 mt-1 mb-4">Start shopping to see your orders here.</p>
              <Link href="/products" className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 transition-colors">Browse Products</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {orders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">#{order.order_number}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}<span className="capitalize">{order.status}</span>
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-gray-900">{formatCurrency(order.total_amount)}</div>
                      <button onClick={() => setSelectedOrder(order)}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 mt-0.5 ml-auto">
                        <Eye className="h-3.5 w-3.5" />Details
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {item.product.image_url
                            ? <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover rounded-lg" />
                            : <Package className="h-4 w-4 text-gray-400" />}
                        </div>
                        <span className="text-xs text-gray-700 flex-1 truncate">{item.product.name}</span>
                        <span className="text-xs text-gray-500">×{item.quantity}</span>
                        <span className="text-xs font-medium text-gray-900">{formatCurrency(item.total_price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Order #{selectedOrder.order_number}</h3>
                <p className="text-xs text-gray-500">{formatDate(selectedOrder.created_at)}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {selectedOrder.order_items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    {item.product.image_url
                      ? <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover rounded-lg" />
                      : <Package className="h-5 w-5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{item.product.name}</div>
                    <div className="text-xs text-gray-500">Qty: {item.quantity} &nbsp;·&nbsp; {formatCurrency(item.unit_price)} each</div>
                  </div>
                  <div className="text-sm font-bold text-gray-900 flex-shrink-0">{formatCurrency(item.total_price)}</div>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-base font-bold text-primary-600">{formatCurrency(selectedOrder.total_amount)}</span>
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
