import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          phone: string | null
          password_hash: string
          sponsor_id: string | null
          ibo_number: string
          sponsor_number: string | null
          admin_number: string | null
          role: 'admin' | 'distributor'
          status: 'active' | 'inactive'
          // MVP profile fields
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          country?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_account_type?: string | null
          bank_account_holder?: string | null
          id_number?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          phone?: string | null
          password_hash: string
          sponsor_id?: string | null
          ibo_number: string
          sponsor_number?: string | null
          admin_number?: string | null
          role?: 'admin' | 'distributor'
          status?: 'active' | 'inactive'
          // MVP profile fields
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          country?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_account_type?: string | null
          bank_account_holder?: string | null
          id_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          phone?: string | null
          password_hash?: string
          sponsor_id?: string | null
          ibo_number?: string
          sponsor_number?: string | null
          admin_number?: string | null
          role?: 'admin' | 'distributor'
          status?: 'active' | 'inactive'
          // MVP profile fields
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          country?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_account_type?: string | null
          bank_account_holder?: string | null
          id_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string
          price: number
          image_url: string | null
          image_urls?: string[] | null
          category: string
          stock_quantity: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          price: number
          image_url?: string | null
          image_urls?: string[] | null
          category: string
          stock_quantity?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price?: number
          image_url?: string | null
          image_urls?: string[] | null
          category?: string
          stock_quantity?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          order_number: string
          total_amount: number
          status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          shipping_address: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_number: string
          total_amount: number
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          shipping_address?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_number?: string
          total_amount?: number
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          shipping_address?: any
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
        }
      }
      commissions: {
        Row: {
          id: string
          user_id: string
          order_id: string
          commission_amount: number
          level: number
          status: 'pending' | 'paid'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_id: string
          commission_amount: number
          level: number
          status?: 'pending' | 'paid'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_id?: string
          commission_amount?: number
          level?: number
          status?: 'pending' | 'paid'
          created_at?: string
        }
      }
      commission_rates: {
        Row: {
          id: string
          level: number
          percentage: number
          is_active: boolean
        }
        Insert: {
          id?: string
          level: number
          percentage: number
          is_active?: boolean
        }
        Update: {
          id?: string
          level?: number
          percentage?: number
          is_active?: boolean
        }
      }
      ranks: {
        Row: {
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
        Insert: {
          id?: string
          name: string
          level_order: number
          team_sales_target?: number
          personal_sales_target?: number
          min_active_members?: number
          salary?: number
          rank_bonus?: number
          commission_levels?: Record<string, number>
          description?: string | null
          requirements?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          level_order?: number
          team_sales_target?: number
          personal_sales_target?: number
          min_active_members?: number
          salary?: number
          rank_bonus?: number
          commission_levels?: Record<string, number>
          description?: string | null
          requirements?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
