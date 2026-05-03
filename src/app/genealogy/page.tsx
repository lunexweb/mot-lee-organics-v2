'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  Users, 
  ChevronDown, 
  ChevronRight,
  User,
  Mail,
  Phone,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Award,
  Tag,
  Star,
  Briefcase,
  Users2
} from 'lucide-react'

interface GenealogyNode {
  id: string
  name: string
  email: string
  phone?: string
  ibo_number: string
  level: number
  sponsor_id: string | null
  status: 'active' | 'inactive'
  personal_sales: number
  total_earnings: number
  downline_count: number
  children?: GenealogyNode[]
  isExpanded?: boolean
}

export default function GenealogyPage() {
  const { userProfile } = useAuth()
  const [genealogyData, setGenealogyData] = useState<GenealogyNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<GenealogyNode | null>(null)
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree')
  const [treeStats, setTreeStats] = useState({
    totalDownline: 0,
    activeMembers: 0,
    teamSalesRevenue: 0,
    levelsDeep: 0,
    paidEarnings: 0,
    pendingEarnings: 0,
  })

  useEffect(() => {
    if (userProfile) {
      fetchGenealogyData()
    }
  }, [userProfile])

  const fetchGenealogyData = async () => {
    if (!userProfile) return
    
    setLoading(true)
    try {
      // Fetch all users with their sponsor relationships
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, phone, ibo_number, sponsor_id, status')

      if (usersError) throw usersError
      if (!allUsers || allUsers.length === 0) return

      // Fetch order counts per user
      const { data: orderData } = await supabase
        .from('orders')
        .select('user_id')
        .in('status', ['processing', 'shipped', 'delivered'])

      // Fetch paid commission totals per user
      const { data: commissionData } = await supabase
        .from('commissions')
        .select('user_id, commission_amount')
        .eq('status', 'paid')

      // Build stats maps
      const orderCountMap = new Map<string, number>()
      ;(orderData || []).forEach(o => {
        orderCountMap.set(o.user_id, (orderCountMap.get(o.user_id) || 0) + 1)
      })

      const earningsMap = new Map<string, number>()
      ;(commissionData || []).forEach(c => {
        earningsMap.set(c.user_id, (earningsMap.get(c.user_id) || 0) + c.commission_amount)
      })

      // Count direct downline per user
      const downlineCountMap = new Map<string, number>()
      allUsers.forEach(u => {
        if (u.sponsor_id) {
          downlineCountMap.set(u.sponsor_id, (downlineCountMap.get(u.sponsor_id) || 0) + 1)
        }
      })

      // Build tree data with stats
      const enrichedData = allUsers.map(u => ({
        ...u,
        personal_sales: orderCountMap.get(u.id) || 0,
        total_earnings: earningsMap.get(u.id) || 0,
        downline_count: downlineCountMap.get(u.id) || 0,
      }))

      const treeData = buildGenealogyTree(enrichedData, userProfile.id)
      setGenealogyData(treeData)

      // Collect all downline IDs (exclude the root user)
      const downlineUsers = enrichedData.filter(u => u.id !== userProfile.id)

      // Build set of all IDs in Herry's tree (recursive)
      const allDownlineIds = new Set<string>()
      const collectDownline = (nodeId: string) => {
        const children = enrichedData.filter(u => u.sponsor_id === nodeId)
        children.forEach(child => {
          allDownlineIds.add(child.id)
          collectDownline(child.id)
        })
      }
      collectDownline(userProfile.id)

      // Team sales: fetch actual revenue from all downline orders
      let teamSalesRevenue = 0
      if (allDownlineIds.size > 0) {
        const { data: teamOrdersData } = await supabase
          .from('orders')
          .select('total_amount')
          .in('user_id', Array.from(allDownlineIds))
        teamSalesRevenue = (teamOrdersData || []).reduce((sum, o) => sum + (o.total_amount || 0), 0)
      }

      // Count active members in downline
      const activeMembers = enrichedData.filter(u => allDownlineIds.has(u.id) && u.status === 'active').length

      // Calculate levels deep
      const levelsDeep = treeData ? (function getMaxLevel(node: GenealogyNode): number {
        if (!node.children || node.children.length === 0) return node.level
        return Math.max(...node.children.map(getMaxLevel))
      })(treeData) : 0

      // Fetch MY earnings (paid and pending commissions for the logged-in user)
      const { data: myPaidComms } = await supabase
        .from('commissions')
        .select('commission_amount')
        .eq('user_id', userProfile.id)
        .eq('status', 'paid')

      const { data: myPendingComms } = await supabase
        .from('commissions')
        .select('commission_amount')
        .eq('user_id', userProfile.id)
        .eq('status', 'pending')

      const paidEarnings = (myPaidComms || []).reduce((sum, c) => sum + (c.commission_amount || 0), 0)
      const pendingEarnings = (myPendingComms || []).reduce((sum, c) => sum + (c.commission_amount || 0), 0)

      setTreeStats({
        totalDownline: allDownlineIds.size,
        activeMembers,
        teamSalesRevenue,
        levelsDeep,
        paidEarnings,
        pendingEarnings,
      })
    } catch (error) {
      console.error('Error fetching genealogy:', error)
    } finally {
      setLoading(false)
    }
  }

  const buildGenealogyTree = (data: any[], rootUserId: string): GenealogyNode | null => {
    if (!data || data.length === 0) return null

    const nodeMap = new Map<string, GenealogyNode>()

    // Create all nodes
    data.forEach(item => {
      const node: GenealogyNode = {
        id: item.id,
        name: item.name,
        email: item.email,
        phone: item.phone,
        ibo_number: item.ibo_number,
        level: 0,
        sponsor_id: item.sponsor_id,
        status: item.status || 'active',
        personal_sales: item.personal_sales || 0,
        total_earnings: item.total_earnings || 0,
        downline_count: item.downline_count || 0,
        children: []
      }
      nodeMap.set(item.id, node)
    })

    // Build parent-child relationships
    data.forEach(item => {
      if (item.sponsor_id && nodeMap.has(item.sponsor_id)) {
        const child = nodeMap.get(item.id)!
        const parent = nodeMap.get(item.sponsor_id)!
        parent.children!.push(child)
      }
    })

    // Set levels starting from root user
    const rootNode = nodeMap.get(rootUserId)
    if (!rootNode) return null

    const setLevels = (node: GenealogyNode, level: number) => {
      node.level = level
      node.children?.forEach(child => setLevels(child, level + 1))
    }
    setLevels(rootNode, 0)

    // Auto-expand first level
    setExpandedNodes(new Set([rootNode.id]))

    return rootNode
  }

  const toggleNodeExpansion = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const filterNodes = (node: GenealogyNode | null, term: string): GenealogyNode | null => {
    if (!node) return null
    
    const matchesSearch = 
      node.name.toLowerCase().includes(term.toLowerCase()) ||
      node.email.toLowerCase().includes(term.toLowerCase()) ||
      node.ibo_number.toLowerCase().includes(term.toLowerCase())

    const filteredChildren = node.children
      ?.map(child => filterNodes(child, term))
      .filter(child => child !== null) as GenealogyNode[] || []

    return {
      ...node,
      children: filteredChildren,
      isExpanded: matchesSearch || expandedNodes.has(node.id)
    }
  }

  const renderTreeNode = (node: GenealogyNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id) || node.isExpanded
    const hasChildren = node.children && node.children.length > 0
    const filteredNode = searchTerm ? filterNodes(node, searchTerm) : node
    const isSelected = selectedNode?.id === node.id

    if (!filteredNode) return null

    return (
      <div key={node.id}>
        {/* Compact Row */}
        <div
          className={`flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
            isSelected ? 'bg-blue-50 hover:bg-blue-50' : 'bg-white'
          }`}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
          onClick={() => setSelectedNode(isSelected ? null : filteredNode)}
        >
          {/* Expand toggle */}
          <div className="w-5 flex-shrink-0 flex items-center justify-center">
            {hasChildren ? (
              <button
                onClick={(e) => { e.stopPropagation(); toggleNodeExpansion(node.id) }}
                className="p-0.5 rounded hover:bg-slate-200 transition-colors"
              >
                {isExpanded
                  ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
              </button>
            ) : <span className="w-5" />}
          </div>

          {/* Avatar initial */}
          <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${
            node.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
          }`}>
            {node.name.charAt(0).toUpperCase()}
          </div>

          {/* Name + IBO */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{node.name}</div>
            <div className="text-xs text-slate-400 truncate">{node.ibo_number}</div>
          </div>

          {/* Level */}
          <div className="hidden sm:block flex-shrink-0 text-xs text-slate-500 w-10 text-center">Lv {node.level}</div>

          {/* Downline count */}
          <div className="flex-shrink-0 w-8 text-center">
            <span className="text-xs font-bold text-slate-700">{node.downline_count}</span>
          </div>

          {/* Status dot */}
          <div className="flex-shrink-0 w-5 flex items-center justify-center">
            <span className={`inline-block w-2 h-2 rounded-full ${
              node.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
            }`} />
          </div>
        </div>

        {/* Inline expanded detail */}
        {isSelected && (
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div>
                <div className="text-xs text-slate-400">Sales</div>
                <div className="text-sm font-bold text-slate-800">{node.personal_sales}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Earnings</div>
                <div className="text-sm font-bold text-slate-800">{formatCurrency(node.total_earnings)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Status</div>
                <div className={`text-sm font-bold capitalize ${
                  node.status === 'active' ? 'text-emerald-600' : 'text-slate-500'
                }`}>{node.status}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{node.email}</span>
            </div>
            {node.phone && (
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span>{node.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {filteredNode.children?.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const renderListView = (node: GenealogyNode | null) => {
    if (!node) return null

    const allNodes: GenealogyNode[] = []
    const collectNodes = (n: GenealogyNode) => {
      allNodes.push(n)
      n.children?.forEach(collectNodes)
    }
    collectNodes(node)

    const filteredNodes = allNodes.filter(n =>
      !searchTerm ||
      n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.ibo_number.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <div>
        {filteredNodes.map((n, idx) => {
          const isSelected = selectedNode?.id === n.id
          return (
            <div key={n.id}>
              {/* Compact Row */}
              <div
                className={`flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                  isSelected ? 'bg-blue-50 hover:bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                }`}
                onClick={() => setSelectedNode(isSelected ? null : n)}
              >
                {/* Avatar initial */}
                <div className="w-5 flex-shrink-0" />
                <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${
                  n.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                }`}>
                  {n.name.charAt(0).toUpperCase()}
                </div>

                {/* Name + IBO */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{n.name}</div>
                  <div className="text-xs text-slate-400 truncate">{n.ibo_number}</div>
                </div>

                {/* Level */}
                <div className="hidden sm:block flex-shrink-0 text-xs text-slate-500 w-10 text-center">Lv {n.level}</div>

                {/* Downline count */}
                <div className="flex-shrink-0 w-8 text-center">
                  <span className="text-xs font-bold text-slate-700">{n.downline_count}</span>
                </div>

                {/* Status dot */}
                <div className="flex-shrink-0 w-5 flex items-center justify-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    n.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
                  }`} />
                </div>
              </div>

              {/* Inline expanded detail */}
              {isSelected && (
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    <div>
                      <div className="text-xs text-slate-400">Sales</div>
                      <div className="text-sm font-bold text-slate-800">{n.personal_sales}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Earnings</div>
                      <div className="text-sm font-bold text-slate-800">{formatCurrency(n.total_earnings)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Status</div>
                      <div className={`text-sm font-bold capitalize ${
                        n.status === 'active' ? 'text-emerald-600' : 'text-slate-500'
                      }`}>{n.status}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{n.email}</span>
                  </div>
                  {n.phone && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span>{n.phone}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 py-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-0">
            <div className="flex items-center min-w-0">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 mr-2 sm:mr-3 flex-shrink-0" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight truncate">Genealogy Tree</h1>
            </div>
            <Link href="/dashboard" className="text-sm sm:text-base text-gray-600 hover:text-gray-900 self-start sm:self-auto">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {genealogyData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Downline</div>
                <div className="text-lg font-bold text-slate-900">{treeStats.totalDownline}</div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Active</div>
                <div className="text-lg font-bold text-slate-900">{treeStats.activeMembers}</div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Team Rev</div>
                <div className="text-sm font-bold text-slate-900 truncate">{formatCurrency(treeStats.teamSalesRevenue)}</div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                <Award className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Levels</div>
                <div className="text-lg font-bold text-slate-900">{treeStats.levelsDeep}</div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
            />
          </div>
          <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden self-start">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'tree' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Tree
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-l border-slate-200 ${
                viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              List
            </button>
          </div>
        </div>

        {/* Genealogy Display */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Table Column Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-700 text-white">
            <div className="w-5 flex-shrink-0" />
            <div className="w-7 flex-shrink-0" />
            <div className="flex-1 text-xs font-semibold uppercase tracking-wider">Member</div>
            <div className="hidden sm:block w-10 text-center text-xs font-semibold uppercase tracking-wider">Level</div>
            <div className="w-8 text-center text-xs font-semibold uppercase tracking-wider">Team</div>
            <div className="w-5 text-center text-xs font-semibold uppercase tracking-wider">St</div>
          </div>

          {genealogyData ? (
            viewMode === 'tree' ? renderTreeNode(genealogyData) : renderListView(genealogyData)
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Downline Found</h3>
              <p className="text-gray-600">Start building your team by inviting new members!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
