'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

// Lazy load GenealogyTree to improve initial page load
const GenealogyTree = dynamic(() => import('@/components/GenealogyTree'), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading genealogy tree...</p>
      </div>
    </div>
  ),
  ssr: false
})
import { 
  Users, 
  UserPlus, 
  Search,
  Calendar,
  TrendingUp,
  DollarSign,
  ChevronRight,
  Copy,
  CheckCircle
} from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  email: string
  ibo_number: string
  created_at: string
  status: 'active' | 'inactive'
  personal_sales: number
  total_earnings: number
}

export default function TeamPage() {
  const { userProfile } = useAuth()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [referralLink, setReferralLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (userProfile) {
      fetchTeamMembers()
      generateReferralLink()
    }
  }, [userProfile])

  const fetchTeamMembers = async () => {
    if (!userProfile) return
    
    try {
      // Get direct downline
      const { data: downline, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          ibo_number,
          created_at,
          status
        `)
        .eq('sponsor_id', userProfile.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching team members:', error)
        setTeamMembers([])
        setLoading(false)
        return
      }

      // If no downline, show empty state immediately
      if (!downline || downline.length === 0) {
        setTeamMembers([])
        setLoading(false)
        return
      }

      // Batch fetch all stats efficiently - avoid N+1 queries
      const memberIds = downline.map(m => m.id)
      
      // Fetch all orders and commissions in parallel
      const [ordersRes, commissionsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('user_id')
          .in('user_id', memberIds),
        supabase
          .from('commissions')
          .select('user_id, commission_amount')
          .in('user_id', memberIds)
          .eq('status', 'paid')
      ])

      // Group orders by user_id
      const ordersByUser = (ordersRes.data || []).reduce((acc: Record<string, number>, order) => {
        acc[order.user_id] = (acc[order.user_id] || 0) + 1
        return acc
      }, {})

      // Group commissions by user_id
      const earningsByUser = (commissionsRes.data || []).reduce((acc: Record<string, number>, comm) => {
        acc[comm.user_id] = (acc[comm.user_id] || 0) + comm.commission_amount
        return acc
      }, {})

      // Map stats to members
      const membersWithStats = downline.map((member) => ({
        ...member,
        personal_sales: ordersByUser[member.id] || 0,
        total_earnings: earningsByUser[member.id] || 0,
      }))

      setTeamMembers(membersWithStats)
    } catch (error) {
      console.error('Error fetching team members:', error)
      setTeamMembers([])
    } finally {
      setLoading(false)
    }
  }

  const generateReferralLink = () => {
    if (userProfile) {
      const baseUrl = window.location.origin
      // Generate sponsor URL: name-IBO_number format (always use IBO number for compatibility)
      const nameSlug = userProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      const iboNum = userProfile.ibo_number
      setReferralLink(`${baseUrl}/signup?sponsor=${nameSlug}-${iboNum}`)
    }
  }

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.ibo_number.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalTeamSales = teamMembers.reduce((sum, member) => sum + member.personal_sales, 0)
  const activeMembers = teamMembers.filter(member => member.status === 'active').length

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
                <h1 className="text-base font-semibold text-gray-900 leading-tight">My Team</h1>
              </div>
            </div>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 flex-shrink-0">← Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, color: 'text-primary-600', bg: 'bg-primary-50', label: 'Total Members', value: teamMembers.length },
            { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', label: 'Active', value: activeMembers },
            { icon: DollarSign, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Team Sales', value: formatCurrency(totalTeamSales) },
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

        {/* Referral link */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Your Referral Link</h3>
            <p className="text-xs text-gray-500">Share to grow your team</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="text" value={referralLink} readOnly title={referralLink}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 min-w-0 truncate" />
            <button onClick={copyReferralLink}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors flex-shrink-0 flex items-center gap-1.5">
              {linkCopied ? <><CheckCircle className="h-4 w-4" />Copied!</> : <><Copy className="h-4 w-4" />Copy</>}
            </button>
          </div>
        </div>

        {/* Genealogy Tree */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <GenealogyTree />
        </div>

        {/* Members list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Team Members</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50 w-48" />
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900">{searchTerm ? 'No members found' : 'No team members yet'}</p>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                {searchTerm ? 'Try different search terms.' : 'Share your referral link to start building your team.'}
              </p>
              {!searchTerm && (
                <button onClick={copyReferralLink}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 transition-colors">
                  <UserPlus className="h-4 w-4" />Copy Referral Link
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
                {['Member', 'IBO', 'Joined', 'Status', 'Sales'].map(h => (
                  <div key={h} className="text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</div>
                ))}
              </div>
              {filteredMembers.map((member) => (
                <div key={member.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{member.name}</div>
                    <div className="text-xs text-gray-500 truncate">{member.email}</div>
                  </div>
                  <div className="text-xs text-gray-700 whitespace-nowrap">{member.ibo_number}</div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">{new Date(member.created_at).toLocaleDateString()}</div>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                    member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>{member.status}</span>
                  <div className="text-xs font-medium text-gray-900 whitespace-nowrap">{member.personal_sales}</div>
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