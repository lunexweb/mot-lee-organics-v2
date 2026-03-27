'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Award,
  Target,
  Briefcase,
  Star,
  ChevronLeft,
  Info
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

export default function RanksPage() {
  const [ranks, setRanks] = useState<Rank[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null)

  useEffect(() => {
    fetchRanks()
  }, [])

  const fetchRanks = async () => {
    try {
      const { data, error } = await supabase
        .from('ranks')
        .select('*')
        .eq('is_active', true)
        .order('level_order', { ascending: true })

      if (error) throw error
      setRanks(data || [])
    } catch (error) {
      console.error('Error fetching ranks:', error)
    } finally {
      setLoading(false)
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
                <h1 className="text-base font-semibold text-gray-900 leading-tight">Rank Advancement</h1>
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
            { icon: Award, color: 'text-primary-600', bg: 'bg-primary-50', label: 'Total Ranks', value: ranks.length },
            { icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Highest Rank', value: ranks[ranks.length - 1]?.name || 'N/A' },
            { icon: Briefcase, color: 'text-green-600', bg: 'bg-green-50', label: 'Max Salary', value: ranks.length ? formatCurrency(Math.max(...ranks.map(r => r.salary))) : '-' },
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

        {/* Ranks Grid */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Rank Progression Path</h2>
            <p className="text-xs text-gray-500 mt-0.5">Click any rank to view requirements and benefits</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ranks.map((rank) => (
                <div key={rank.id}
                  className={`border-2 rounded-xl p-3.5 cursor-pointer transition-all hover:shadow-sm ${
                    selectedRank?.id === rank.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                  }`}
                  onClick={() => setSelectedRank(selectedRank?.id === rank.id ? null : rank)}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{rank.name}</h3>
                      <span className="text-xs text-gray-400">Level {rank.level_order}</span>
                    </div>
                    <div className="w-8 h-8 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Award className="h-4 w-4 text-primary-600" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Target className="h-3 w-3" />Team Sales</span>
                      <span className="text-xs font-semibold text-gray-900">{formatCurrency(rank.team_sales_target)}</span>
                    </div>
                    {rank.personal_sales_target > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 flex items-center gap-1"><DollarSign className="h-3 w-3" />Personal Sales</span>
                        <span className="text-xs font-semibold text-gray-900">{formatCurrency(rank.personal_sales_target)}</span>
                      </div>
                    )}
                    {rank.min_active_members > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 flex items-center gap-1"><Users className="h-3 w-3" />Min Members</span>
                        <span className="text-xs font-semibold text-gray-900">{rank.min_active_members}</span>
                      </div>
                    )}
                    {rank.salary > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 flex items-center gap-1"><Briefcase className="h-3 w-3" />Salary</span>
                        <span className="text-xs font-semibold text-green-600">{formatCurrency(rank.salary)}</span>
                      </div>
                    )}
                    {rank.rank_bonus > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 flex items-center gap-1"><Star className="h-3 w-3" />Bonus</span>
                        <span className="text-xs font-semibold text-primary-600">{formatCurrency(rank.rank_bonus)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex flex-wrap gap-1">
                    {Object.entries(rank.commission_levels).slice(0, 3).map(([level, percentage]) => (
                      <span key={level} className="px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded-md">L{level}: {percentage}%</span>
                    ))}
                    {Object.keys(rank.commission_levels).length > 3 && (
                      <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-md">+{Object.keys(rank.commission_levels).length - 3}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Rank Detail */}
        {selectedRank && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">{selectedRank.name}</h2>
                {selectedRank.description && <p className="text-xs text-gray-500 mt-0.5">{selectedRank.description}</p>}
              </div>
              <button onClick={() => setSelectedRank(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>
            <div className="p-4 space-y-4">
              {selectedRank.requirements && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-1">Requirements</h3>
                  <p className="text-xs text-gray-600">{selectedRank.requirements}</p>
                </div>
              )}
              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-2">Commission Structure</h3>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map(level => {
                    const commission = selectedRank.commission_levels?.[level.toString()] || 0
                    return (
                      <div key={level} className={`text-center p-2 rounded-xl border ${
                        commission > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'
                      }`}>
                        <div className="text-xs text-gray-500">L{level}</div>
                        <div className={`text-xs font-bold mt-0.5 ${commission > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                          {commission > 0 ? `${commission}%` : '—'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="h-3.5 w-3.5 text-primary-600" />
                    <span className="text-xs font-semibold text-gray-700">Team Target</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(selectedRank.team_sales_target)}</p>
                </div>
                {selectedRank.salary > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Briefcase className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs font-semibold text-gray-700">Monthly Salary</span>
                    </div>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(selectedRank.salary)}</p>
                  </div>
                )}
                {selectedRank.rank_bonus > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Star className="h-3.5 w-3.5 text-primary-600" />
                      <span className="text-xs font-semibold text-gray-700">Rank Bonus</span>
                    </div>
                    <p className="text-sm font-bold text-primary-600">{formatCurrency(selectedRank.rank_bonus)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
          <p className="text-xs text-gray-400">Built by <a href="https://www.lunexweb.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">lunexweb</a></p>
        </div>
      </footer>
    </div>
  )
}
