'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Users, User, ChevronDown, ChevronRight } from 'lucide-react'

interface TreeNode {
  id: string
  name: string
  email: string
  ibo_number: string
  status: 'active' | 'inactive'
  children: TreeNode[]
  level: number
}

export default function GenealogyTree() {
  const { userProfile } = useAuth()
  const [treeData, setTreeData] = useState<TreeNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (userProfile) {
      buildGenealogyTree()
    }
  }, [userProfile])

  const buildGenealogyTree = async () => {
    if (!userProfile) return
    
    try {
      // Get all users in the system for building the tree
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('id, name, email, ibo_number, sponsor_id, status')

      if (error) {
        console.error('Error fetching users:', error)
        setTreeData(null)
        setLoading(false)
        return
      }

      // If no users, show empty state immediately
      if (!allUsers || allUsers.length === 0) {
        setTreeData(null)
        setLoading(false)
        return
      }

      // Build tree structure
      const userMap = new Map<string, TreeNode>()
      
      // Create nodes
      allUsers.forEach(user => {
        userMap.set(user.id, {
          id: user.id,
          name: user.name,
          email: user.email,
          ibo_number: user.ibo_number,
          status: user.status,
          children: [],
          level: 0
        })
      })

      // Build relationships
      allUsers.forEach(user => {
        if (user.sponsor_id && userMap.has(user.sponsor_id)) {
          const child = userMap.get(user.id)!
          const parent = userMap.get(user.sponsor_id)!
          child.level = parent.level + 1
          parent.children.push(child)
        }
      })

      // Find the current user's node
      const currentUserNode = userMap.get(userProfile.id)
      if (currentUserNode) {
        setTreeData(currentUserNode)
        // Auto-expand first level
        setExpandedNodes(new Set([currentUserNode.id]))
      } else {
        setTreeData(null)
      }
    } catch (error) {
      console.error('Error building genealogy tree:', error)
      setTreeData(null)
    } finally {
      setLoading(false)
    }
  }

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children.length > 0

    return (
      <div key={node.id} className="ml-4">
        <div 
          className={`flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50 gap-3 min-w-0 ${
            depth === 0 ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200'
          }`}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          <div className="flex items-center flex-1 min-w-0">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400 mr-2" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400 mr-2" />
              )
            ) : (
              <div className="w-6 mr-2"></div>
            )}
            
            <div className={`p-2 rounded-full ${
              depth === 0 ? 'bg-primary-600' : 'bg-gray-400'
            }`}>
              <User className="h-4 w-4 text-white" />
            </div>
            
            <div className="ml-3 min-w-0">
              <div className="flex items-center min-w-0">
                <h3 className={`font-medium truncate ${
                  depth === 0 ? 'text-primary-900' : 'text-gray-900'
                }`}>
                  {node.name}
                </h3>
                {depth === 0 && (
                  <span className="ml-2 text-xs bg-primary-200 text-primary-800 px-2 py-1 rounded-full">
                    You
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 break-words truncate" title={node.email}>{node.email}</p>
              <p className="text-xs text-gray-500 break-words truncate" title={`IBO: ${node.ibo_number}`}>IBO: {node.ibo_number}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              node.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {node.status}
            </span>
            {hasChildren && (
              <span className="text-xs text-gray-500">
                {node.children.length} member{node.children.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="mt-2">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Genealogy Tree</h3>
          <div className="text-sm text-gray-600">Loading...</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-3"></div>
            <p className="text-gray-600">Loading team structure...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!treeData) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No team data available</h3>
        <p className="text-gray-600">Start building your team to see the genealogy tree</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Genealogy Tree</h3>
        <div className="text-sm text-gray-600">Showing {treeData.children.length} direct referrals</div>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 overflow-x-hidden">
        {renderNode(treeData)}
      </div>
      
      {treeData.children.length === 0 && (
        <div className="text-center py-8">
          <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium">No team members yet</p>
          <p className="text-sm text-gray-500">Share your referral link to start building your team and earning commissions</p>
        </div>
      )}
    </div>
  )
}
