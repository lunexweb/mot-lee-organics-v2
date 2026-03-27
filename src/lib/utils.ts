import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount)
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 5)
  return `MLO-${timestamp}-${random}`.toUpperCase()
}

export function generatePaymentReference(orderNumber: string, iboNumber?: string): string {
  // Use IBO number directly as reference (simpler and shorter)
  if (iboNumber) {
    return iboNumber.toUpperCase()
  }
  // Fallback to short order number if no IBO number
  const short = orderNumber.replace(/[^A-Z0-9]/g, '').slice(-10)
  return `ORDER-${short}`.toUpperCase()
}

export function formatAddress(address: {
  fullName?: string
  phone?: string
  line1?: string
  line2?: string
  suburb?: string
  city?: string
  province?: string
  postalCode?: string
}): string {
  const parts = [
    address.line1,
    address.line2,
    address.suburb,
    address.city,
    address.province,
    address.postalCode,
  ].filter(Boolean)
  return parts.join(', ')
}

export async function generateUniqueIBONumber(supabase: any): Promise<string> {
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    const random = Math.random().toString(36).substr(2, 8)
    const iboNumber = `IBO-${random}`.toUpperCase()
    
    // Check if IBO number already exists
    const { data, error } = await supabase
      .from('users')
      .select('ibo_number')
      .eq('ibo_number', iboNumber)
      .single()
    
    if (error && error.code === 'PGRST116') {
      // No record found - this IBO number is unique
      return iboNumber
    }
    
    attempts++
  }
  
  // Fallback: use timestamp if all random attempts fail
  const timestamp = Date.now().toString(36)
  return `IBO-${timestamp}`.toUpperCase()
}

export async function generateUniqueSponsorNumber(supabase: any): Promise<string> {
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    const random = Math.random().toString(36).substr(2, 6)
    const sponsorNumber = `SP-${random}`.toUpperCase()
    
    // Check if sponsor number already exists
    const { data, error } = await supabase
      .from('users')
      .select('sponsor_number')
      .eq('sponsor_number', sponsorNumber)
      .single()
    
    if (error && error.code === 'PGRST116') {
      // No record found - this sponsor number is unique
      return sponsorNumber
    }
    
    attempts++
  }
  
  // Fallback: use timestamp if all random attempts fail
  const timestamp = Date.now().toString(36)
  return `SP-${timestamp}`.toUpperCase()
}

export async function generateUniqueAdminNumber(supabase: any): Promise<string> {
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    const random = Math.random().toString(36).substr(2, 6)
    const adminNumber = `ADM-${random}`.toUpperCase()
    
    // Check if admin number already exists
    const { data, error } = await supabase
      .from('users')
      .select('admin_number')
      .eq('admin_number', adminNumber)
      .single()
    
    if (error && error.code === 'PGRST116') {
      // No record found - this admin number is unique
      return adminNumber
    }
    
    attempts++
  }
  
  // Fallback: use timestamp if all random attempts fail
  const timestamp = Date.now().toString(36)
  return `ADM-${timestamp}`.toUpperCase()
}

export function getCommissionRate(level: number): number {
  const rates = {
    1: 0.10, // 10%
    2: 0.05, // 5%
    3: 0.02, // 2%
  }
  return rates[level as keyof typeof rates] || 0
}

export function calculateCommission(amount: number, level: number): number {
  const rate = getCommissionRate(level)
  return amount * rate
}

export function getSponsorLevel(userId: string, sponsorId: string, users: any[]): number {
  if (userId === sponsorId) return 0
  
  const user = users.find(u => u.id === userId)
  if (!user || !user.sponsor_id) return 0
  
  if (user.sponsor_id === sponsorId) return 1
  
  const sponsor = users.find(u => u.id === user.sponsor_id)
  if (!sponsor || !sponsor.sponsor_id) return 0
  
  if (sponsor.sponsor_id === sponsorId) return 2
  
  const grandSponsor = users.find(u => u.id === sponsor.sponsor_id)
  if (!grandSponsor || !grandSponsor.sponsor_id) return 0
  
  if (grandSponsor.sponsor_id === sponsorId) return 3
  
  return 0
}
