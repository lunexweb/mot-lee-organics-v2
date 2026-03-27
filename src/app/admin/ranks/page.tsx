'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Award,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

interface Rank {
  id: string
  name: string
  level_order: number
  team_sales_target: number
  personal_sales_target: number
  min_active_members: number
  salary: number
  rank_bonus: number
  commission_levels: Record<string, number>
  description: string | null
  requirements: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface EditingRank {
  [key: string]: Partial<Rank>
}

export default function RanksManagement() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [ranks, setRanks] = useState<Rank[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRank, setEditingRank] = useState<EditingRank>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchRanks()
    }
  }, [userProfile])

  const fetchRanks = async () => {
    try {
      const { data, error } = await supabase
        .from('ranks')
        .select('*')
        .order('level_order', { ascending: true })

      if (error) throw error
      setRanks(data || [])
    } catch (error) {
      console.error('Error fetching ranks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (rank: Rank) => {
    setEditingRank(prev => ({
      ...prev,
      [rank.id]: { ...rank }
    }))
  }

  const handleSave = async (rankId: string) => {
    setSaving(rankId)
    try {
      const editedData = editingRank[rankId]
      if (!editedData) return

      const { error } = await supabase
        .from('ranks')
        .update({
          name: editedData.name,
          level_order: editedData.level_order,
          team_sales_target: editedData.team_sales_target,
          personal_sales_target: editedData.personal_sales_target,
          min_active_members: editedData.min_active_members,
          salary: editedData.salary,
          rank_bonus: editedData.rank_bonus,
          commission_levels: editedData.commission_levels,
          description: editedData.description,
          requirements: editedData.requirements,
          is_active: editedData.is_active
        })
        .eq('id', rankId)

      if (error) throw error

      // Clear editing state
      setEditingRank(prev => {
        const newState = { ...prev }
        delete newState[rankId]
        return newState
      })

      // Refresh data
      await fetchRanks()
    } catch (error) {
      console.error('Error saving rank:', error)
    } finally {
      setSaving(null)
    }
  }

  const handleCancel = (rankId: string) => {
    setEditingRank(prev => {
      const newState = { ...prev }
      delete newState[rankId]
      return newState
    })
  }

  const handleCommissionChange = (rankId: string, level: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setEditingRank(prev => ({
      ...prev,
      [rankId]: {
        ...prev[rankId],
        commission_levels: {
          ...(prev[rankId]?.commission_levels || {}),
          [level]: numValue
        }
      }
    }))
  }

  const moveRank = async (rankId: string, direction: 'up' | 'down') => {
    const rankIndex = ranks.findIndex(r => r.id === rankId)
    if (rankIndex === -1) return

    const newOrder = [...ranks]
    const targetIndex = direction === 'up' ? rankIndex - 1 : rankIndex + 1

    if (targetIndex < 0 || targetIndex >= newOrder.length) return

    // Swap level_order
    const temp = newOrder[rankIndex].level_order
    newOrder[rankIndex].level_order = newOrder[targetIndex].level_order
    newOrder[targetIndex].level_order = temp

    // Update in database
    try {
      const { error } = await supabase
        .from('ranks')
        .upsert([
          { id: newOrder[rankIndex].id, level_order: newOrder[rankIndex].level_order },
          { id: newOrder[targetIndex].id, level_order: newOrder[targetIndex].level_order }
        ])

      if (error) throw error
      await fetchRanks()
    } catch (error) {
      console.error('Error reordering ranks:', error)
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
          <Award className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to manage ranks.</p>
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            <div className="flex items-center min-w-0 gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">ML</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 leading-none">Admin Panel</p>
                <h1 className="text-base font-semibold text-gray-900 leading-tight">Rank Management</h1>
              </div>
            </div>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900 flex-shrink-0">← Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-3">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">MLM Compensation Plan</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage rank requirements and commission structure</p>
          </div>

          <div className="p-4 space-y-3">
            {ranks.map((rank, index) => {
              const isEditing = editingRank[rank.id]
              const currentEdit = isEditing || rank

              return (
                <div key={rank.id} className="border border-gray-200 rounded-xl p-4">
                  {/* Rank header */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <input type="text" value={currentEdit.name}
                          onChange={(e) => setEditingRank(prev => ({ ...prev, [rank.id]: { ...prev[rank.id], name: e.target.value } }))}
                          className="text-sm font-bold text-gray-900 border border-gray-200 rounded-xl px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      ) : (
                        <h3 className="text-sm font-bold text-gray-900">{rank.name}</h3>
                      )}
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">L{rank.level_order}</span>
                      {!isEditing && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          rank.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>{rank.is_active ? 'Active' : 'Inactive'}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {index > 0 && (
                        <button onClick={() => moveRank(rank.id, 'up')} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" title="Move up">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {index < ranks.length - 1 && (
                        <button onClick={() => moveRank(rank.id, 'down')} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" title="Move down">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isEditing ? (
                        <>
                          <button onClick={() => handleSave(rank.id)} disabled={saving === rank.id}
                            className="p-1.5 text-green-600 hover:text-green-700 rounded-lg hover:bg-green-50" title="Save">
                            {saving === rank.id
                              ? <div className="animate-spin h-3.5 w-3.5 border-b-2 border-green-600 rounded-full" />
                              : <Save className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => handleCancel(rank.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50" title="Cancel">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleEdit(rank)} className="p-1.5 text-blue-600 hover:text-blue-700 rounded-lg hover:bg-blue-50" title="Edit">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fields grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {([
                      ['Team Sales', 'team_sales_target', 'number', (v: any) => formatCurrency(v)],
                      ['Personal Sales', 'personal_sales_target', 'number', (v: any) => formatCurrency(v)],
                      ['Min Members', 'min_active_members', 'number', (v: any) => v],
                      ['Salary', 'salary', 'number', (v: any) => formatCurrency(v)],
                      ['Rank Bonus', 'rank_bonus', 'number', (v: any) => formatCurrency(v)],
                    ] as [string, keyof Rank, string, (v: any) => any][]).map(([label, field, type, fmt]) => (
                      <div key={field}>
                        <label className="block text-xs text-gray-500 mb-1">{label}</label>
                        {isEditing ? (
                          <input type={type} value={currentEdit[field] as any}
                            onChange={(e) => setEditingRank(prev => ({ ...prev, [rank.id]: { ...prev[rank.id], [field]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value } }))}
                            className="w-full text-xs border border-gray-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        ) : (
                          <p className="text-xs font-semibold text-gray-900">{fmt(rank[field])}</p>
                        )}
                      </div>
                    ))}
                    {/* Status when editing */}
                    {isEditing && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Status</label>
                        <select value={currentEdit.is_active ? 'true' : 'false'}
                          onChange={(e) => setEditingRank(prev => ({ ...prev, [rank.id]: { ...prev[rank.id], is_active: e.target.value === 'true' } }))}
                          className="w-full text-xs border border-gray-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500">
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Commission levels */}
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Commission Levels (%)</p>
                    <div className="flex flex-wrap gap-2">
                      {[1,2,3,4,5,6,7].map(level => {
                        const commission = currentEdit.commission_levels?.[level.toString()] || 0
                        return (
                          <div key={level} className="text-center">
                            <div className="text-xs text-gray-400 mb-1">L{level}</div>
                            {isEditing ? (
                              <input type="number" step="0.1" value={commission}
                                onChange={(e) => handleCommissionChange(rank.id, level.toString(), e.target.value)}
                                className="w-14 text-xs border border-gray-200 rounded-xl px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            ) : (
                              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                                commission > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                              }`}>{commission > 0 ? `${commission}%` : '—'}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Requirements */}
                  <div className="mt-3">
                    <label className="block text-xs text-gray-500 mb-1">Requirements</label>
                    {isEditing ? (
                      <textarea value={currentEdit.requirements || ''}
                        onChange={(e) => setEditingRank(prev => ({ ...prev, [rank.id]: { ...prev[rank.id], requirements: e.target.value } }))}
                        rows={2}
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    ) : (
                      <p className="text-xs text-gray-500">{rank.requirements || 'No requirements specified'}</p>
                    )}
                  </div>
                </div>
              )
            })}
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
