'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertModal } from '@/components/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  Users, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Package,
  UserCheck,
  AlertCircle,
  Activity,
  BarChart3,
  Settings,
  LogOut,
  Award,
  Search,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Crown,
  Network,
  Wallet,
  CreditCard,
  X,
  ChevronRight
} from 'lucide-react'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalOrders: number
  totalRevenue: number
  pendingCommissions: number
  totalCommissions: number
  recentOrders: any[]
  topPerformers: any[]
}

interface IBOData {
  profile: any
  orders: any[]
  commissions: any[]
  wallet: any
  transactions: any[]
  genealogy: {
    sponsor: any
    downline: any[]
  }
  rank: any
}

export default function AdminDashboard() {
  const { user, userProfile, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [iboNumber, setIboNumber] = useState('')
  const [searchResults, setSearchResults] = useState<IBOData | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingCommissions: 0,
    totalCommissions: 0,
    recentOrders: [],
    topPerformers: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchAdminStats()
    }
  }, [userProfile])

  const fetchAdminStats = async () => {
    try {
      // Run all independent queries in parallel for maximum performance
      const [
        totalUsersRes,
        activeUsersRes,
        totalOrdersRes,
        ordersRes,
        totalCommissionsRes,
        pendingCommissionsRes,
        recentOrdersRes,
        topPerformersRes
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total_amount').in('status', ['processing','shipped','delivered']),
        supabase.from('commissions').select('*', { count: 'exact', head: true }),
        supabase.from('commissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase
          .from('orders')
          .select(`
            id,
            order_number,
            total_amount,
            status,
            created_at,
            users!inner(name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('users')
          .select(`
            id,
            name,
            email,
            ibo_number,
            orders!inner(total_amount)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5)
      ])

      const totalRevenue = ordersRes.data?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      setStats({
        totalUsers: totalUsersRes.count || 0,
        activeUsers: activeUsersRes.count || 0,
        totalOrders: totalOrdersRes.count || 0,
        totalRevenue,
        pendingCommissions: pendingCommissionsRes.count || 0,
        totalCommissions: totalCommissionsRes.count || 0,
        recentOrders: recentOrdersRes.data || [],
        topPerformers: topPerformersRes.data || []
      })
    } catch (error) {
      console.error('Error fetching admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchIBO = async () => {
    if (!iboNumber.trim()) {
      setSearchError('Please enter an IBO number')
      return
    }

    setSearchLoading(true)
    setSearchError('')
    setSearchResults(null)

    try {
      // First get the user profile
      const profileRes = await supabase
        .from('users')
        .select('*')
        .eq('ibo_number', iboNumber.trim())
        .single()

      if (profileRes.error) {
        throw new Error(`IBO not found: ${profileRes.error.message}`)
      }

      const userId = profileRes.data.id

      // Fetch all other data in parallel
      const [
        ordersData,
        commissionsData,
        walletData,
        transactionsData,
        sponsorData,
        downlineData,
        rankData
      ] = await Promise.all([
        supabase.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('commissions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('wallets').select('*').eq('user_id', userId).single(),
        supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
        supabase.from('users').select('name, email, ibo_number, phone').eq('id', profileRes.data.sponsor_id).single(),
        supabase.from('users').select('name, email, ibo_number, phone, status, created_at').eq('sponsor_id', userId).order('created_at', { ascending: false }),
        supabase.from('ranks').select('*').eq('user_id', userId).single()
      ])

      setSearchResults({
        profile: profileRes.data,
        orders: ordersData.data || [],
        commissions: commissionsData.data || [],
        wallet: walletData.data,
        transactions: transactionsData.data || [],
        genealogy: {
          sponsor: sponsorData.data,
          downline: downlineData.data || []
        },
        rank: rankData.data
      })

    } catch (error: any) {
      console.error('Error searching IBO:', error)
      setSearchError(error.message || 'Failed to search IBO. Please try again.')
    } finally {
      setSearchLoading(false)
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
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
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
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            <div className="flex items-center min-w-0 gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">ML</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 leading-none">Admin Panel</p>
                <h1 className="text-base font-semibold text-gray-900 leading-tight">Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-sm text-gray-500 hidden sm:inline truncate max-w-[30vw]">{userProfile?.name}</span>
              <button onClick={async () => { await signOut(); router.replace('/login') }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
                <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">

        {/* IBO Search */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">IBO Search</h3>
            <p className="text-xs text-gray-500">Search any IBO by their number</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="text" placeholder="Enter IBO number (e.g., IBO-N8P5RAKR)"
              value={iboNumber} onChange={(e) => setIboNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchIBO()}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0" />
            <button onClick={searchIBO} disabled={searchLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex-shrink-0">
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
            <button onClick={() => setSearchModalOpen(true)} disabled={!searchResults}
              className="px-4 py-2 border border-blue-300 text-blue-700 hover:bg-blue-100 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex-shrink-0">
              View Results
            </button>
          </div>
          {searchError && <p className="text-xs text-red-600 mt-2">{searchError}</p>}
          {searchResults && <p className="text-xs text-green-600 mt-2">Found: {searchResults.profile.name} ({searchResults.profile.ibo_number})</p>}
        </div>

        {/* Referral link */}
        {userProfile && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Your Referral Link</h3>
              <p className="text-xs text-gray-500">Share to grow your team</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/signup?sponsor=${userProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}-${userProfile.admin_number || userProfile.ibo_number}` : 'Loading...'}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 min-w-0 truncate" />
              <button onClick={async () => {
                  const link = typeof window !== 'undefined' ? `${window.location.origin}/signup?sponsor=${userProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}-${userProfile.admin_number || userProfile.ibo_number}` : ''
                  try { await navigator.clipboard.writeText(link); setCopyModalOpen(true); setTimeout(() => setCopyModalOpen(false), 1200) } catch (err) {}
                }}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors flex-shrink-0">
                Copy
              </button>
            </div>
            {userProfile.admin_number && <p className="text-xs text-gray-400 mt-1.5">Admin Number: <strong>{userProfile.admin_number}</strong></p>}
          </div>
        )}

        <AlertModal open={copyModalOpen} title="Copied" message="Link copied!" onClose={() => setCopyModalOpen(false)} />

        {/* IBO Details Modal */}
        {searchModalOpen && searchResults && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-2xl my-4 shadow-xl">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">IBO Details</h2>
                  <p className="text-xs text-gray-500">{searchResults.profile.name} · {searchResults.profile.ibo_number}</p>
                </div>
                <button onClick={() => setSearchModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
              </div>

              <div className="p-5 space-y-4">
                {/* Profile */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Profile</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[['Name', searchResults.profile.name], ['IBO Number', searchResults.profile.ibo_number], ['Email', searchResults.profile.email],
                      ['Phone', searchResults.profile.phone || '—'], ['Joined', new Date(searchResults.profile.created_at).toLocaleDateString()]].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
                      </div>
                    ))}
                    <div>
                      <p className="text-xs text-gray-400">Status</p>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full mt-0.5 ${
                        searchResults.profile.status === 'active' ? 'bg-green-100 text-green-800' :
                        searchResults.profile.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>{searchResults.profile.status}</span>
                    </div>
                  </div>
                </div>

                {/* Wallet */}
                {searchResults.wallet && (
                  <div className="grid grid-cols-3 gap-3">
                    {[['Balance', searchResults.wallet.balance, 'text-green-600'],
                      ['Total Earned', searchResults.wallet.total_earnings, 'text-blue-600'],
                      ['Withdrawn', searchResults.wallet.total_withdrawn, 'text-orange-600']].map(([label, val, cls]) => (
                      <div key={label as string} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-1">{label as string}</p>
                        <p className={`text-sm font-bold ${cls as string}`}>{formatCurrency(val as number)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Genealogy */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-gray-500 mb-2">Sponsor</h4>
                    {searchResults.genealogy.sponsor
                      ? <div><p className="text-sm font-medium text-gray-900">{searchResults.genealogy.sponsor.name}</p><p className="text-xs text-gray-500">{searchResults.genealogy.sponsor.ibo_number}</p></div>
                      : <p className="text-xs text-gray-400">No sponsor info</p>}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-gray-500 mb-2">Downline ({searchResults.genealogy.downline.length})</h4>
                    {searchResults.genealogy.downline.length > 0
                      ? <div className="space-y-1.5 max-h-24 overflow-y-auto">{searchResults.genealogy.downline.map((m, i) => (
                          <div key={i}><p className="text-xs font-medium text-gray-900">{m.name}</p><p className="text-xs text-gray-400">{m.ibo_number} · {m.status}</p></div>
                        ))}</div>
                      : <p className="text-xs text-gray-400">No downline</p>}
                  </div>
                </div>

                {/* Orders */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-1.5">
                    <ShoppingCart className="h-3.5 w-3.5 text-orange-500" />
                    <h3 className="text-xs font-semibold text-gray-700">Orders ({searchResults.orders.length})</h3>
                  </div>
                  {searchResults.orders.length > 0
                    ? <div className="divide-y divide-gray-50 max-h-44 overflow-y-auto">{searchResults.orders.map((order) => (
                        <div key={order.id} className="flex justify-between items-center px-4 py-2.5">
                          <div><p className="text-xs font-medium text-gray-900">{order.order_number}</p><p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p></div>
                          <div className="text-right"><p className="text-xs font-bold text-gray-900">{formatCurrency(order.total_amount)}</p>
                            <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                            }`}>{order.status}</span></div>
                        </div>
                      ))}</div>
                    : <p className="text-xs text-gray-400 text-center py-4">No orders</p>}
                </div>

                {/* Commissions */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-yellow-500" />
                    <h3 className="text-xs font-semibold text-gray-700">Commissions ({searchResults.commissions.length})</h3>
                  </div>
                  {searchResults.commissions.length > 0
                    ? <div className="divide-y divide-gray-50 max-h-44 overflow-y-auto">{searchResults.commissions.map((c) => (
                        <div key={c.id} className="flex justify-between items-center px-4 py-2.5">
                          <div><p className="text-xs font-medium text-gray-900">{c.type || 'Commission'}</p><p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</p></div>
                          <div className="text-right"><p className="text-xs font-bold text-gray-900">{formatCurrency(c.amount)}</p>
                            <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                              c.status === 'paid' ? 'bg-green-100 text-green-800' : c.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>{c.status}</span></div>
                        </div>
                      ))}</div>
                    : <p className="text-xs text-gray-400 text-center py-4">No commissions</p>}
                </div>

                {/* Transactions */}
                {searchResults.transactions.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
                      <h3 className="text-xs font-semibold text-gray-700">Transactions ({searchResults.transactions.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-44 overflow-y-auto">
                      {searchResults.transactions.map((t) => (
                        <div key={t.id} className="flex justify-between items-center px-4 py-2.5">
                          <div><p className="text-xs font-medium text-gray-900 capitalize">{t.type}</p><p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString()}</p></div>
                          <div className="text-right">
                            <p className={`text-xs font-bold ${t.type === 'deposit' || t.type === 'commission' ? 'text-green-600' : 'text-red-600'}`}>
                              {t.type === 'deposit' || t.type === 'commission' ? '+' : '-'}{formatCurrency(t.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { icon: Users, color: 'text-primary-600', bg: 'bg-primary-50', label: 'Total Users', value: stats.totalUsers },
            { icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50', label: 'Active', value: stats.activeUsers },
            { icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Orders', value: stats.totalOrders },
            { icon: DollarSign, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Revenue', value: formatCurrency(stats.totalRevenue) },
            { icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Commissions', value: stats.totalCommissions },
            { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Pending Com.', value: stats.pendingCommissions },
          ].map(({ icon: Icon, color, bg, label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500 truncate">{label}</div>
                <div className="text-sm font-bold text-gray-900 truncate">{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { href: '/admin/users', icon: Users, color: 'text-primary-600', bg: 'bg-primary-50', label: 'Users', sub: 'Manage all IBOs' },
            { href: '/admin/products', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Products', sub: 'Add & edit products' },
            { href: '/admin/orders', icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50', label: 'Orders', sub: 'Track & process' },
            { href: '/admin/payments', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50', label: 'Payments', sub: 'Confirm EFTs' },
            { href: '/admin/withdrawals', icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Withdrawals', sub: 'Approve payouts' },
            { href: '/admin/commissions', icon: Award, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Commissions', sub: 'Process payouts' },
            { href: '/admin/ranks', icon: Crown, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Ranks', sub: 'Manage comp plan' },
            { href: '/admin/settings', icon: Settings, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Settings', sub: 'Platform config' },
          ].map(({ href, icon: Icon, color, bg, label, sub }) => (
            <Link key={href} href={href} className="group bg-white rounded-xl border-2 border-gray-200 p-3 hover:shadow-md hover:border-primary-400 hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              <div className="flex items-start justify-between mb-2">
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-primary-500 transition-colors mt-0.5" />
              </div>
              <div className="text-xs font-semibold text-gray-900">{label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
            </Link>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Recent Orders</h3>
            </div>
            {stats.recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No recent orders</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {stats.recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                      <p className="text-xs text-gray-500">{order.users?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total_amount)}</p>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>{order.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Top Performers</h3>
            </div>
            {stats.topPerformers.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No performance data yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {stats.topPerformers.map((performer: any, index: number) => (
                  <div key={performer.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{performer.name}</p>
                        <p className="text-xs text-gray-500">{performer.ibo_number}</p>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-gray-700">{performer.orders?.length || 0} orders</div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
