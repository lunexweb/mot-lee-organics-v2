'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  Users, 
  Search,
  Filter,
  Edit,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Save,
  X
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  ibo_number: string
  role: 'admin' | 'distributor'
  status: 'active' | 'inactive'
  created_at: string
  sponsor_id: string | null
  sponsor_name?: string
  personal_sales: number
  total_earnings: number
  downline_count: number
}

export default function UserManagement() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'distributor'>('all')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive',
    role: 'distributor' as 'admin' | 'distributor'
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string>('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [payingUserId, setPayingUserId] = useState<string | null>(null)

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchUsers()
    }
  }, [userProfile])

  const fetchUsers = async () => {
    try {
      const { data: usersData, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          phone,
          ibo_number,
          role,
          status,
          created_at,
          sponsor_id
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        return
      }

      // Get additional stats for each user
      const usersWithStats = await Promise.all(
        (usersData || []).map(async (user) => {
          // Get personal sales count
          const { count: personalSales } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

          // Get total earnings
          const { data: commissions } = await supabase
            .from('commissions')
            .select('commission_amount')
            .eq('user_id', user.id)
            .eq('status', 'paid')

          const totalEarnings = commissions?.reduce((sum, comm) => sum + comm.commission_amount, 0) || 0

          // Get downline count
          const { count: downlineCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('sponsor_id', user.id)

          // Get sponsor name
          let sponsorName = null
          if (user.sponsor_id) {
            const { data: sponsor } = await supabase
              .from('users')
              .select('name')
              .eq('id', user.sponsor_id)
              .single()
            sponsorName = sponsor?.name
          }

          return {
            ...user,
            personal_sales: personalSales || 0,
            total_earnings: totalEarnings,
            downline_count: downlineCount || 0,
            sponsor_name: sponsorName
          }
        })
      )

      setUsers(usersWithStats)
    } catch (error) {
      console.error('Error fetching users:', error)
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
        p_note: 'Admin payout from Users page'
      })
      if (error) {
        console.error('Error paying commissions:', error)
        return
      }
      await fetchUsers()
    } catch (e) {
      console.error('Error paying commissions:', e)
    } finally {
      setPayingUserId(null)
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      status: user.status,
      role: user.role
    })
    // Clear any previous errors or success messages
    setSaveError('')
    setSaveSuccess(false)
    setSaving(false)
  }

  const handleSaveUser = async () => {
    if (!editingUser) return

    // Validation
    if (!editForm.name.trim()) {
      setSaveError('Name is required')
      return
    }

    if (!editForm.email.trim()) {
      setSaveError('Email is required')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editForm.email)) {
      setSaveError('Please enter a valid email address')
      return
    }

    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editForm.name.trim(),
          email: editForm.email.trim().toLowerCase(),
          phone: editForm.phone.trim() || null,
          status: editForm.status,
          role: editForm.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id)

      if (error) {
        console.error('Error updating user:', error)
        setSaveError(error.message || 'Failed to update user. Please try again.')
        setSaving(false)
        return
      }

      // Success! (Don't rely on returned data due to RLS policies)
      setSaveSuccess(true)
      
      // Refresh users list
      await fetchUsers()
      
      // Close modal after brief delay
      setTimeout(() => {
        setEditingUser(null)
        setSaveSuccess(false)
        setSaveError('')
      }, 1500)
      
    } catch (error: any) {
      console.error('Error updating user:', error)
      setSaveError(error?.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (user: User) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active'
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating user status:', error)
        return
      }

      // Refresh users list
      await fetchUsers()
    } catch (error) {
      console.error('Error updating user status:', error)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.ibo_number.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    return matchesSearch && matchesStatus && matchesRole
  })

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
          <Users className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access user management.</p>
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
                <h1 className="text-base font-semibold text-gray-900 leading-tight">User Management</h1>
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
            { icon: Users, color: 'text-primary-600', bg: 'bg-primary-50', label: 'Total Users', value: users.length },
            { icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50', label: 'Active', value: users.filter(u => u.status === 'active').length },
            { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Distributors', value: users.filter(u => u.role === 'distributor').length },
            { icon: DollarSign, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Total Earnings', value: formatCurrency(users.reduce((s, u) => s + u.total_earnings, 0)) },
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
            <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'distributor')}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="distributor">Distributor</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['User','IBO Number','Role','Status','Sponsor','Sales','Earnings','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 font-mono">{user.ibo_number}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>{user.role}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>{user.status}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{user.sponsor_name || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{user.personal_sales}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-900">{formatCurrency(user.total_earnings)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/users/${user.id}`} className="text-xs text-primary-600 hover:text-primary-900 font-medium">View</Link>
                        <button onClick={() => handlePayAllForUser(user.id)} disabled={payingUserId === user.id}
                          className="text-xs text-green-600 hover:text-green-900 font-medium disabled:opacity-50">
                          {payingUserId === user.id ? 'Paying…' : 'Pay All'}
                        </button>
                        <button onClick={() => handleEditUser(user)} className="text-primary-600 hover:text-primary-900">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleToggleStatus(user)}
                          className={user.status === 'active' ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'}>
                          {user.status === 'active' ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="text-center py-10">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No users found</p>
            </div>
          )}
        </div>
      </main>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Edit User</h3>
              <button onClick={() => { setEditingUser(null); setSaveError(''); setSaveSuccess(false) }} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              {saveSuccess && <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">User updated successfully!</div>}
              {saveError && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">{saveError}</div>}
              {[['Name','text','name'],['Email','email','email'],['Phone','tel','phone']].map(([label,type,field]) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={(editForm as any)[field]}
                    onChange={(e) => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select value={editForm.role} onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'distributor' }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="distributor">Distributor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => { setEditingUser(null); setSaveError(''); setSaveSuccess(false) }} disabled={saving}
                  className="px-4 py-2 text-sm border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleSaveUser} disabled={saving} type="button"
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
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
