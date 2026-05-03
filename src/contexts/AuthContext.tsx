'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string, userData: any) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      // Fetch all fields in one query (faster than two queries)
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          phone,
          sponsor_id,
          ibo_number,
          sponsor_number,
          admin_number,
          role,
          status,
          address_line1,
          address_line2,
          city,
          province,
          postal_code,
          country,
          bank_name,
          bank_account_number,
          bank_branch_code,
          bank_account_type,
          bank_account_holder,
          id_number,
          created_at,
          updated_at
        `)
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        setUserProfile(null)
      } else if (data) {
        setUserProfile(data as UserProfile)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUserProfile(null)
    }
  }, [])

  useEffect(() => {
    // Get initial session - don't block on profile fetch
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        
        // Stop loading immediately - don't wait for profile
        setLoading(false)
        
        // Fetch profile in background (non-blocking)
        if (session?.user) {
          fetchUserProfile(session.user.id).catch(() => {
            // Silently handle errors - profile will load eventually
          })
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          // Fetch profile but don't block
          fetchUserProfile(session.user.id).catch(() => {
            // Silently handle errors
          })
        } else {
          setUserProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUserProfile])

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            name: userData.name,
            phone: userData.phone,
            ibo_number: userData.ibo_number,
            sponsor_number: userData.sponsor_number,
            sponsor_id: userData.sponsor_id,
            role: 'distributor',
            status: 'active',
          })

        if (profileError) {
          console.error('❌ Error creating user profile:', profileError)
          throw profileError
        }
        
        if (userData.sponsor_id) {
          console.log('✅ User created with sponsor_id:', userData.sponsor_id)
        } else {
          console.log('ℹ️ User created without sponsor (independent signup)')
        }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id)
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
