'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, generateOrderNumber, generatePaymentReference } from '@/lib/utils'
import { COMPANY_EFT_DETAILS } from '@/lib/config'
import { ArrowLeft } from 'lucide-react'

interface ProductRef {
  id: string
  name: string
  price: number
}

interface CartItem {
  product: ProductRef
  quantity: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, userProfile, loading } = useAuth()
  const [cart, setCart] = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedProvince, setSelectedProvince] = useState<string>('')
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    suburb: '',
    city: '',
    province: '',
    postalCode: '',
    notes: '',
  })

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!userProfile) return

    const isActiveIBO = userProfile?.status === 'active' && !!userProfile?.ibo_number
    if (!isActiveIBO) {
      router.replace('/products')
      return
    }
    try {
      const stored = localStorage.getItem('mlm_cart')
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[]
        setCart(parsed)
      } else {
        router.replace('/products')
      }
      // Load saved province if available - auto-fill and lock it
      const savedProvince = localStorage.getItem('mlm_selected_province')
      if (savedProvince) {
        setSelectedProvince(savedProvince)
        setForm(prev => ({ ...prev, province: savedProvince }))
      } else {
        // If no province selected in cart, redirect back
        router.replace('/products')
      }
    } catch {
      router.replace('/products')
    }
  }, [router, user, userProfile, loading])

  const getCartSubtotal = () => cart.reduce((t, i) => t + i.product.price * i.quantity, 0)

  const getTaxAmount = () => {
    const subtotal = getCartSubtotal()
    return subtotal * 0.15 // 15% tax
  }

  const getShippingAmount = () => {
    const province = form.province || selectedProvince
    if (!province) return 0
    return province === 'Gauteng' ? 99.99 : 149.00
  }

  const getCartTotal = () => {
    const subtotal = getCartSubtotal()
    const tax = getTaxAmount()
    const shipping = getShippingAmount()
    return subtotal + tax + shipping
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile || cart.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      const orderNumber = generateOrderNumber()
      const subtotal = getCartSubtotal()
      const tax = getTaxAmount()
      const shipping = getShippingAmount()
      const totalAmount = getCartTotal()
      const paymentReference = generatePaymentReference(orderNumber, userProfile.ibo_number)
      const shippingAddress = {
        fullName: form.fullName,
        phone: form.phone,
        line1: form.line1,
        line2: form.line2,
        suburb: form.suburb,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
        notes: form.notes,
      }

      // Create order with pending status - admin must approve payment before it counts
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userProfile.id,
          order_number: orderNumber,
          total_amount: totalAmount,
          status: 'pending',
          payment_status: 'pending',
          shipping_address: shippingAddress as any,
        })

      if (orderError) {
        throw orderError
      }

      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .single()

      if (fetchError || !order) {
        throw fetchError || new Error('Order not found after insert')
      }

      // Insert order items
      const itemsPayload = cart.map(ci => ({
        order_id: order.id,
        product_id: ci.product.id,
        quantity: ci.quantity,
        unit_price: ci.product.price,
        total_price: ci.product.price * ci.quantity,
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload)
      if (itemsError) throw itemsError

      // Save reference locally for display on the next page (Phase 1; no DB column yet)
      try {
        localStorage.setItem(`mlm_order_ref_${order.id}`, paymentReference)
      } catch {}

      // Clear cart and go to order view
      try { localStorage.removeItem('mlm_cart') } catch {}
      router.replace(`/orders/${order.id}`)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong while placing your order')
    } finally {
      setSubmitting(false)
    }
  }

  if (cart.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            <div className="flex items-center min-w-0 gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">ML</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 leading-none">Member Portal</p>
                <h1 className="text-base font-semibold text-gray-900 leading-tight">Checkout</h1>
              </div>
            </div>
            <button onClick={() => router.push('/products')} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />Products
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Delivery form */}
          <form className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5" onSubmit={handleSubmit}>
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Delivery Details</h2>
            {error && (
              <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Full name', field: 'fullName', required: true },
                { label: 'Phone', field: 'phone', required: true },
              ].map(({ label, field, required }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} required={required} />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Address line 1</label>
                <input className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.line1} onChange={e => setForm({ ...form, line1: e.target.value })} required />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Address line 2 (optional)</label>
                <input className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.line2} onChange={e => setForm({ ...form, line2: e.target.value })} />
              </div>
              {[
                { label: 'Suburb', field: 'suburb', required: true },
                { label: 'City', field: 'city', required: true },
              ].map(({ label, field, required }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} required={required} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Province</label>
                <select className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-100 cursor-not-allowed focus:outline-none"
                  value={form.province || selectedProvince} disabled required title="Province locked from cart selection">
                  <option value="">-- Select Province --</option>
                  {['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','Northern Cape','North West','Western Cape'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Locked from cart. Go back to change.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Postal code</label>
                <input className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })} required />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="submit" disabled={submitting}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                {submitting ? 'Placing order...' : 'Place Order'}
              </button>
            </div>
          </form>

          {/* Order summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Order Summary</h2>
              <div className="space-y-2 mb-3">
                {cart.map((item) => (
                  <div className="flex items-center justify-between" key={item.product.id}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(item.product.price)} × {item.quantity}</p>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 flex-shrink-0 ml-2">{formatCurrency(item.product.price * item.quantity)}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Subtotal</span><span className="font-medium text-gray-900">{formatCurrency(getCartSubtotal())}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Tax (15%)</span><span className="font-medium text-gray-900">{formatCurrency(getTaxAmount())}</span>
                </div>
                {(form.province || selectedProvince) && (
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Shipping</span><span className="font-medium text-gray-900">{formatCurrency(getShippingAmount())}</span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Total</span>
                  <span className="text-base font-bold text-primary-600">{formatCurrency(getCartTotal())}</span>
                </div>
              </div>
            </div>

            {/* Bank details */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-1.5">🏦 Bank Transfer Details</h3>
              <div className="space-y-1.5 text-xs">
                {[
                  ['Account Name', COMPANY_EFT_DETAILS.accountName],
                  ['Bank', COMPANY_EFT_DETAILS.swiftCode === 'ABSAZAJJ' ? 'ABSA' : 'Bank'],
                  ['Account No.', COMPANY_EFT_DETAILS.accountNumber],
                  ['Branch Code', COMPANY_EFT_DETAILS.branchCode],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-900">{value}</span>
                  </div>
                ))}
                <div className="border-t border-green-200 pt-2 flex justify-between items-center">
                  <span className="text-gray-500">Reference</span>
                  <span className="font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-lg">{userProfile?.ibo_number || 'IBO Number'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-green-700">{formatCurrency(getCartTotal())}</span>
                </div>
              </div>
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                <p>Use your IBO number as payment reference. We'll confirm and ship within 24 hours.</p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}


