'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { COMPANY_EFT_DETAILS } from '@/lib/config'
import { formatCurrency } from '@/lib/utils'
import { Printer, Download, Share2, X } from 'lucide-react'
import { AlertModal } from '@/components/Modal'
// @ts-ignore - html2pdf.js doesn't have TypeScript types
import html2pdf from 'html2pdf.js'

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  product?: { name: string }
}

interface Order {
  id: string
  order_number: string
  total_amount: number
  status: string
  created_at: string
  shipping_address: any
  order_items: OrderItem[]
}

export default function OrderDetailsPage() {
  const params = useParams() as { id?: string }
  const router = useRouter()
  const { userProfile } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentRef, setPaymentRef] = useState('')
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertMsg, setAlertMsg] = useState('')

  const generatePaymentReference = () => {
    // Use IBO number as reference
    if (userProfile?.ibo_number) {
      return userProfile.ibo_number
    }
    // Fallback to order number if no IBO number
    return `ORDER-${order?.order_number || ''}`
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    if (!order) return

    setDownloadingPDF(true)
    try {
      const element = document.getElementById('invoice-content')
      if (!element) {
        setDownloadingPDF(false)
        return
      }

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `Invoice-${order.order_number}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: 'avoid-all' } as any
      }

      await html2pdf().set(opt as any).from(element).save()
    } catch (error) {
      console.error('Error generating PDF:', error)
      setAlertMsg('Failed to download PDF. Please try the Print button instead.')
      setAlertOpen(true)
    } finally {
      setDownloadingPDF(false)
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: `Invoice ${order?.order_number}`,
      text: `Invoice for Order ${order?.order_number}`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.error('Error sharing:', err)
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        setAlertMsg('Invoice link copied to clipboard!')
        setAlertOpen(true)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  useEffect(() => {
    const id = params?.id
    if (!id) return
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`*, order_items(*, product:products(name))`)
          .eq('id', id)
          .single()
        if (error) throw error
        setOrder(data as any)
        try {
          const ref = localStorage.getItem(`mlm_order_ref_${id}`)
          if (ref) setPaymentRef(ref)
        } catch {}
      } catch (e) {
        router.replace('/orders')
      } finally {
        setLoading(false)
      }
    })()
  }, [params, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!order) return null

  const addr = order.shipping_address || {}
  const createdDate = new Date(order.created_at)
  const dueDate = new Date(createdDate.getTime() + 2 * 24 * 60 * 60 * 1000)
  const reference = paymentRef || generatePaymentReference()

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white overflow-x-hidden">
      <AlertModal open={alertOpen} title="Notice" message={alertMsg} onClose={() => setAlertOpen(false)} />
      {/* Action buttons - hidden when printing */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 print:hidden">
        <div className="flex items-center justify-between flex-wrap gap-2 overflow-x-hidden">
          <button
            onClick={() => router.push('/orders')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap"
          >
            <X className="h-5 w-5 mr-2" />
            Back to Orders
          </button>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <button 
              onClick={handlePrint}
              className="btn-secondary flex items-center whitespace-nowrap px-3 py-2 text-sm"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap px-3 py-2 text-sm"
            >
              {downloadingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </button>
            <button 
              onClick={handleShare}
              className="btn-secondary flex items-center whitespace-nowrap px-3 py-2 text-sm"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Invoice - optimized for A4 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 print:px-0 print:pb-0">
        <div id="invoice-content" className="bg-white p-8 shadow-sm rounded-lg print:shadow-none print:border-none" style={{ maxWidth: '21cm', margin: '0 auto' }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-6 print:mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center mr-3 font-bold print:bg-gray-800">ML</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 print:text-xl">Invoice</h1>
                <p className="text-sm text-gray-600">Order #{order.order_number}</p>
              </div>
            </div>
          </div>

          {/* Billing Info - Compact */}
          <div className="grid grid-cols-2 gap-6 mb-6 print:mb-4 print:text-xs">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2 print:mb-1">Billed to</h2>
              <p className="text-gray-900 font-medium print:text-sm">{addr.fullName || userProfile?.name}</p>
              <p className="text-gray-700 text-sm">{addr.phone}</p>
              <p className="text-gray-700 text-sm">{addr.line1}</p>
              {addr.line2 && <p className="text-gray-700 text-sm">{addr.line2}</p>}
              <p className="text-gray-700 text-sm">{addr.suburb}, {addr.city}</p>
              <p className="text-gray-700 text-sm">{addr.province}, {addr.postalCode}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2 print:mb-1">Company</h2>
              <p className="text-gray-900 font-medium print:text-sm">{COMPANY_EFT_DETAILS.accountName}</p>
              <p className="text-gray-700 text-sm">Bank: {COMPANY_EFT_DETAILS.swiftCode === 'ABSAZAJJ' ? 'ABSA' : 'Bank'}</p>
              <p className="text-gray-700 text-sm">Account: {COMPANY_EFT_DETAILS.accountNumber}</p>
              <p className="text-gray-700 text-sm">Branch: {COMPANY_EFT_DETAILS.branchCode}</p>
              <p className="text-gray-700 text-sm">SWIFT: {COMPANY_EFT_DETAILS.swiftCode}</p>
              <div className="mt-2 text-sm text-gray-600">
                <div>Invoice: {createdDate.toLocaleDateString()}</div>
                <div>Due: <span className="font-medium">{dueDate.toLocaleDateString()}</span></div>
              </div>
            </div>
          </div>

          {/* Items Table - Compact */}
          <div className="mb-6 print:mb-4">
            <table className="w-full text-sm print:text-xs">
              <thead>
                <tr className="text-left text-gray-600 border-b-2 border-gray-300">
                  <th className="py-2 print:py-1">Item</th>
                  <th className="py-2 print:py-1 text-center">Qty</th>
                  <th className="py-2 print:py-1 text-right">Unit Price</th>
                  <th className="py-2 print:py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.order_items?.map((it) => (
                  <tr key={it.id} className="border-b border-gray-100">
                    <td className="py-2 print:py-1">{it.product?.name || it.product_id}</td>
                    <td className="py-2 print:py-1 text-center">{it.quantity}</td>
                    <td className="py-2 print:py-1 text-right">{formatCurrency(it.unit_price)}</td>
                    <td className="py-2 print:py-1 text-right font-medium">{formatCurrency(it.total_price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={3} className="py-3 print:py-2 text-right font-semibold">Total</td>
                  <td className="py-3 print:py-2 text-right font-bold text-primary-700 text-lg print:text-base">{formatCurrency(order.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Instructions - Compact */}
          <div className="border-t-2 border-gray-300 pt-4 print:pt-3">
            <h2 className="text-base font-semibold text-gray-900 mb-2 print:mb-1 print:text-sm">Payment Instructions (EFT)</h2>
            <p className="text-gray-700 text-sm print:text-xs mb-3 print:mb-2">Please pay via EFT using the exact reference below. Your order remains pending until payment is received.</p>
            <div className="grid grid-cols-2 gap-4 print:gap-2 print:text-xs">
              <div>
                <div className="text-sm text-gray-600 print:text-xs">Account Name</div>
                <div className="font-medium print:text-xs">{COMPANY_EFT_DETAILS.accountName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 print:text-xs">Account Number</div>
                <div className="font-medium print:text-xs">{COMPANY_EFT_DETAILS.accountNumber}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 print:text-xs">Account Type</div>
                <div className="font-medium print:text-xs">{COMPANY_EFT_DETAILS.accountType}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 print:text-xs">Branch Code</div>
                <div className="font-medium print:text-xs">{COMPANY_EFT_DETAILS.branchCode}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 print:text-xs">SWIFT Code</div>
                <div className="font-medium print:text-xs">{COMPANY_EFT_DETAILS.swiftCode}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 print:text-xs">Payment Reference</div>
                <div className="font-bold text-primary-700 text-lg print:text-base">{reference}</div>
              </div>
            </div>
            {/* Proof of payment contact */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded print:bg-transparent print:border-0">
              <p className="text-sm text-gray-800 print:text-xs font-medium">Send Proof of payment</p>
              <p className="text-sm text-gray-700 print:text-xs">email: {COMPANY_EFT_DETAILS.salesEmail}</p>
              <p className="text-sm text-gray-700 print:text-xs">or</p>
              <p className="text-sm text-gray-700 print:text-xs">whatsapp number: {COMPANY_EFT_DETAILS.whatsapp}</p>
            </div>
            <div className="mt-3 print:mt-2 text-xs text-gray-500 print:text-[10px]">{COMPANY_EFT_DETAILS.invoiceFooter}</div>
          </div>
        </div>
      </main>
      
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:bg-white {
            background: white !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:px-0 {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .print\\:pb-0 {
            padding-bottom: 0 !important;
          }
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
          .print\\:mb-2 {
            margin-bottom: 0.5rem !important;
          }
          .print\\:mb-1 {
            margin-bottom: 0.25rem !important;
          }
          .print\\:pt-3 {
            padding-top: 0.75rem !important;
          }
          .print\\:py-2 {
            padding-top: 0.5rem !important;
            padding-bottom: 0.5rem !important;
          }
          .print\\:py-1 {
            padding-top: 0.25rem !important;
            padding-bottom: 0.25rem !important;
          }
          .print\\:text-xs {
            font-size: 0.75rem !important;
            line-height: 1rem !important;
          }
          .print\\:text-xl {
            font-size: 1.25rem !important;
          }
          .print\\:text-base {
            font-size: 1rem !important;
          }
          .print\\:text-sm {
            font-size: 0.875rem !important;
          }
          .print\\:text-\\[10px\\] {
            font-size: 10px !important;
          }
          .print\\:gap-2 {
            gap: 0.5rem !important;
          }
          .print\\:bg-gray-800 {
            background-color: #1f2937 !important;
          }
          .print\\:mt-2 {
            margin-top: 0.5rem !important;
          }
          .print\\:mt-3 {
            margin-top: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  )
}


