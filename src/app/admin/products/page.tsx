'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  Package, 
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Image,
  DollarSign,
  Tag,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  PartyPopper,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface Product {
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

const PRODUCT_CATEGORIES = [
  'Charcoal',
  'Chlorophyll Drops',
  'Chlorophyll Juice',
  'Collagen',
  'Combos',
  'Creams',
  'Lotions',
  'Masks',
  'Oils',
  'Scrubs',
  'Serums',
  'Soaps',
  'Teas',
  'Toners',
  'Turmeric',
  'Weight Gain Products',
  'Weight Loss Products'
]

export default function ProductManagement() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock_quantity: '',
    is_active: true
  })
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [supportsImageUrls, setSupportsImageUrls] = useState<boolean>(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  // Image lightbox state
  const [showImageModal, setShowImageModal] = useState(false)
  const [modalImages, setModalImages] = useState<string[]>([])
  const [modalIndex, setModalIndex] = useState(0)

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      detectImageUrlsSupport()
      fetchProducts()
    }
  }, [userProfile])

  const detectImageUrlsSupport = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, image_urls')
        .limit(1)

      if (error) {
        // Column might not exist yet; mark unsupported
        setSupportsImageUrls(false)
      } else {
        // If select succeeds but column is undefined, still consider supported for when SQL is updated
        setSupportsImageUrls(true)
      }
    } catch {
      setSupportsImageUrls(false)
    }
  }

  const openImageModal = (images: string[], index: number = 0) => {
    if (!images || images.length === 0) return
    setModalImages(images)
    setModalIndex(index)
    setShowImageModal(true)
  }

  const closeImageModal = () => {
    setShowImageModal(false)
    setModalImages([])
    setModalIndex(0)
  }

  const prevModalImage = () => {
    setModalIndex((prev) => (prev - 1 + modalImages.length) % modalImages.length)
  }

  const nextModalImage = () => {
    setModalIndex((prev) => (prev + 1) % modalImages.length)
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching products:', error)
        return
      }

      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const remainingSlots = 6 - imageUrls.length
    if (remainingSlots <= 0) {
      setUploadError('Maximum 6 images allowed. Remove some images first.')
      return
    }
    
    const filesToUpload = Array.from(files).slice(0, Math.min(files.length, remainingSlots))
    if (filesToUpload.length === 0) return

    setUploading(true)
    setUploadError('')
    setUploadProgress(10)
    
    try {
      // Validate all files first (instant check)
      const validFiles: File[] = []
      for (const file of filesToUpload) {
        if (!file.type.startsWith('image/')) {
          setUploadError(`${file.name} is not an image file. Skipping...`)
          continue
        }
        if (file.size > 5 * 1024 * 1024) {
          setUploadError(`${file.name} is too large. Maximum size is 5MB. Skipping...`)
          continue
        }
        validFiles.push(file)
      }

      if (validFiles.length === 0) {
        setUploadError('No valid images to upload.')
        setUploading(false)
        return
      }

      setUploadProgress(30)

      // Upload ALL images in PARALLEL for maximum speed (not sequential!)
      const uploadPromises = validFiles.map(async (file, idx) => {
        const ext = file.name.split('.').pop() || 'jpg'
        const filePath = `products/${Date.now()}_${idx}_${Math.random().toString(36).slice(2)}.${ext}`
        
        const { error: upErr } = await supabase.storage.from('products').upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'image/jpeg',
        })
        
        if (upErr) {
          console.error('Upload error:', upErr)
          if (upErr.message.includes('Bucket not found')) {
            throw new Error('Storage bucket "products" not found. Please create it in Supabase Dashboard.')
          } else if (upErr.message.includes('new row violates row-level security')) {
            throw new Error('Permission denied. Please check storage bucket RLS policies.')
          } else {
            throw new Error(`Failed to upload ${file.name}: ${upErr.message}`)
          }
        }
        
        const { data } = supabase.storage.from('products').getPublicUrl(filePath)
        return data?.publicUrl || null
      })

      setUploadProgress(50)
      
      // Wait for all uploads to complete in parallel (MUCH FASTER!)
      const uploadedUrls = await Promise.all(uploadPromises)
      const successfulUrls = uploadedUrls.filter(Boolean) as string[]

      setUploadProgress(90)

      if (successfulUrls.length === 0) {
        setUploadError('No images were uploaded. Please try again.')
      } else {
        // Update image URLs all at once (instant update)
        setImageUrls(prev => [...prev, ...successfulUrls].slice(0, 6))
        setUploadError('') // Clear any previous errors on success
        setUploadProgress(100)
      }
    } catch (err: any) {
      console.error('Upload exception:', err)
      setUploadError(err?.message || 'Failed to upload images. Please check your connection and try again.')
    } finally {
      setUploading(false)
      // Progress will reset automatically on next upload or after brief delay if successful
      setTimeout(() => setUploadProgress(0), 500)
    }
  }
  
  const handleRemoveImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    await handleFilesSelected(e.dataTransfer.files)
  }

  const handleAddProduct = async () => {
    // Validation
    if (!productForm.name.trim()) {
      setSubmitError('Product name is required')
      return
    }
    
    if (!productForm.description.trim()) {
      setSubmitError('Product description is required')
      return
    }
    
    if (!productForm.price || parseFloat(productForm.price) <= 0) {
      setSubmitError('Valid price is required')
      return
    }
    
    if (!productForm.category) {
      setSubmitError('Product category is required')
      return
    }
    
    if (!productForm.stock_quantity || parseInt(productForm.stock_quantity) < 0) {
      setSubmitError('Valid stock quantity is required')
      return
    }
    
    if (imageUrls.length === 0) {
      setSubmitError('At least one product image is required')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    setSubmitSuccess(false)

    try {
      // Prepare payload instantly - no delays
      const payload: any = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: parseFloat(productForm.price),
        category: productForm.category,
        stock_quantity: parseInt(productForm.stock_quantity),
        is_active: productForm.is_active,
      }

      const cleaned = imageUrls.filter(Boolean).slice(0, 6)
      if (cleaned.length > 0) {
        if (supportsImageUrls) {
          payload.image_urls = cleaned
        }
        payload.image_url = cleaned[0]
      }

      // Insert to Supabase immediately - no await delays
      const insertPromise = supabase
        .from('products')
        .insert(payload)
        .select()

      // Show success immediately while insert happens in background
      const { data, error } = await insertPromise

      if (error) {
        console.error('Error adding product:', error)
        setSubmitError(error.message || 'Failed to create product. Please try again.')
        setSubmitting(false)
        return
      }

      // Success! Show celebratory modal instantly
      setSubmitSuccess(false)
      setSuccessMessage('Product Created!')
      setShowSuccessModal(true)
      setSubmitting(false) // Reset loading state immediately
      
      // Close add modal immediately
      setShowAddModal(false)
      
      // Refresh products list in background (don't wait for it)
      fetchProducts().catch(console.error)
      
    } catch (error: any) {
      console.error('Error adding product:', error)
      setSubmitError(error?.message || 'An unexpected error occurred. Please try again.')
      setSubmitting(false)
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      stock_quantity: product.stock_quantity.toString(),
      is_active: product.is_active
    })
    const imgs = (product.image_urls && product.image_urls.length > 0)
      ? product.image_urls
      : (product.image_url ? [product.image_url] : [])
    setImageUrls(imgs)
  }

  const handleUpdateProduct = async () => {
    if (!editingProduct) return

    // Validation
    if (!productForm.name.trim()) {
      setSubmitError('Product name is required')
      return
    }
    
    if (!productForm.description.trim()) {
      setSubmitError('Product description is required')
      return
    }
    
    if (!productForm.price || parseFloat(productForm.price) <= 0) {
      setSubmitError('Valid price is required')
      return
    }
    
    if (!productForm.category) {
      setSubmitError('Product category is required')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    setSubmitSuccess(false)

    try {
      const payload: any = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: parseFloat(productForm.price),
        category: productForm.category,
        stock_quantity: parseInt(productForm.stock_quantity),
        is_active: productForm.is_active
      }

      const cleaned = imageUrls.filter(Boolean).slice(0, 6)
      if (cleaned.length > 0) {
        if (supportsImageUrls) {
          payload.image_urls = cleaned
        }
        payload.image_url = cleaned[0] || null
      } else {
        // If no images, clear both fields
        payload.image_url = null
        if (supportsImageUrls) {
          payload.image_urls = []
        }
      }

      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id)

      if (error) {
        console.error('Error updating product:', error)
        setSubmitError(error.message || 'Failed to update product. Please try again.')
        setSubmitting(false)
        return
      }

      // Success! Show celebratory modal immediately
      setSubmitSuccess(false) // Clear banner state
      setSuccessMessage('Product Updated!')
      setShowSuccessModal(true)
      
      // Refresh products list in background
      fetchProducts().catch(console.error)
      
      // Close edit modal immediately (success modal will overlay it)
      setEditingProduct(null)
    } catch (error: any) {
      console.error('Error updating product:', error)
      setSubmitError(error?.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) {
        console.error('Error deleting product:', error)
        return
      }

      await fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const handleToggleStatus = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)

      if (error) {
        console.error('Error updating product status:', error)
        return
      }

      await fetchProducts()
    } catch (error) {
      console.error('Error updating product status:', error)
    }
  }

  const resetForm = () => {
    setProductForm({
      name: '',
      description: '',
      price: '',
      category: '',
      stock_quantity: '',
      is_active: true
    })
    setImageUrls([])
    setUploadError('')
    setUploadProgress(0)
    setSubmitError('')
    setSubmitSuccess(false)
    setShowSuccessModal(false)
    setSuccessMessage('')
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && product.is_active) ||
      (statusFilter === 'inactive' && !product.is_active)

    return matchesSearch && matchesCategory && matchesStatus
  })

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
          <Package className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access product management.</p>
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
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            <div className="flex items-center min-w-0 gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">ML</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 leading-none">Admin Panel</p>
                <h1 className="text-base font-semibold text-gray-900 leading-tight">Product Management</h1>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Dashboard</Link>
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors">
                <Plus className="h-4 w-4" />Add
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Package, color: 'text-primary-600', bg: 'bg-primary-50', label: 'Total', value: products.length },
            { icon: Tag, color: 'text-green-600', bg: 'bg-green-50', label: 'Active', value: products.filter(p => p.is_active).length },
            { icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Avg Price', value: products.length > 0 ? formatCurrency(products.reduce((s,p)=>s+p.price,0)/products.length) : 'R0' },
            { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Low Stock', value: products.filter(p => p.stock_quantity < 10).length },
          ].map(({ icon: Icon, color, bg, label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}><Icon className={`h-4 w-4 ${color}`} /></div>
              <div className="min-w-0"><div className="text-xs text-gray-500">{label}</div><div className="text-sm font-bold text-gray-900 truncate">{value}</div></div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search products..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
            <option value="all">All Categories</option>
            {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            // Get product images - check image_urls first, fallback to image_url
            const productImages = (product.image_urls && product.image_urls.length > 0)
              ? product.image_urls
              : (product.image_url ? [product.image_url] : [])
            const mainImage = productImages[0]

            return (
            <div key={product.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
              {/* Product Image */}
              {mainImage ? (
                <div className="mb-3 rounded-xl overflow-hidden bg-gray-100 relative group">
                  <img 
                    src={mainImage} 
                    alt={product.name}
                    className="w-full h-40 object-contain cursor-pointer bg-white"
                    onClick={() => openImageModal(productImages, 0)}
                    onError={(e) => {
                      // If image fails to load, hide it
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  {productImages.length > 1 && (
                    <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        className="bg-black/40 hover:bg-black/60 text-white p-1 rounded-full"
                        onClick={(e) => { e.stopPropagation(); openImageModal(productImages, (productImages.length - 1)); }}
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button 
                        className="bg-black/40 hover:bg-black/60 text-white p-1 rounded-full"
                        onClick={(e) => { e.stopPropagation(); openImageModal(productImages, 1); }}
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-3 rounded-xl overflow-hidden bg-gray-100 h-40 flex items-center justify-center">
                  <Image className="h-16 w-16 text-gray-400" />
                </div>
              )}
              
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{product.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                      product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>{product.is_active ? 'Active' : 'Inactive'}</span>
                    <span className="inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 truncate max-w-[8rem]">{product.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                  <button onClick={() => handleEditProduct(product)} className="text-primary-600 hover:text-primary-900">
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDeleteProduct(product.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-2 mt-2">
                <span className="font-bold text-gray-900">{formatCurrency(product.price)}</span>
                <span className={`font-semibold ${product.stock_quantity < 10 ? 'text-red-600' : 'text-gray-600'}`}>{product.stock_quantity} units</span>
              </div>

              <div className="mt-2">
                <button onClick={() => handleToggleStatus(product)}
                  className={`w-full py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    product.is_active ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}>{product.is_active ? 'Deactivate' : 'Activate'}</button>
              </div>
            </div>
            )
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-10">
            <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">No products found</p>
            <button onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700">Add First Product</button>
          </div>
        )}
      </main>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md my-6 shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-sm font-bold text-gray-900">Add New Product</h3>
              <button onClick={() => { setShowAddModal(false); resetForm() }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />{submitError}
                </div>
              )}
              {[['Product Name','text','name','Enter product name'],['Price (R)','number','price','0.00'],['Stock Quantity','number','stock_quantity','0']].map(([label,type,field,ph]) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
                  <input type={type} value={(productForm as any)[field]} placeholder={ph}
                    onChange={(e) => setProductForm(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea value={productForm.description} rows={3} placeholder="Enter product description"
                  onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                <select value={productForm.category} onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Select category</option>
                  {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product Images (up to 6)</label>
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {imageUrls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img src={url} alt={`Preview ${idx+1}`} className="w-full h-20 object-cover rounded-xl border border-gray-200" />
                        <button onClick={() => handleRemoveImage(idx)} type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {imageUrls.length < 6 && (
                  <div onDragOver={(e)=>{e.preventDefault();e.stopPropagation()}} onDragEnter={(e)=>{e.preventDefault();e.stopPropagation()}} onDrop={onDrop}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors">
                    <Image className="h-7 w-7 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-500 mb-1">Drag & drop or</p>
                    <input type="file" accept="image/*" multiple onChange={(e)=>{handleFilesSelected(e.target.files);e.target.value=''}} className="hidden" id="file-input-add" disabled={uploading} />
                    <label htmlFor="file-input-add" className={`text-xs font-semibold text-primary-600 cursor-pointer ${uploading?'opacity-50 cursor-not-allowed':''}`}>{uploading?'Uploading...':'Choose Images'}</label>
                    <p className="text-xs text-gray-400 mt-1">{6-imageUrls.length} slots · Max 5MB</p>
                    {uploading && uploadProgress > 0 && <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2"><div className="bg-primary-600 h-1.5 rounded-full transition-all" style={{width:`${uploadProgress}%`}} /></div>}
                  </div>
                )}
                {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
                {imageUrls.length >= 6 && <p className="text-xs text-amber-600 mt-1">Maximum 6 images reached.</p>}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="is_active" checked={productForm.is_active} onChange={(e) => setProductForm(prev => ({ ...prev, is_active: e.target.checked }))} className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
                <span className="text-sm text-gray-700">Active product</span>
              </label>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => { setShowAddModal(false); resetForm() }}
                className="px-4 py-2 text-sm border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddProduct} disabled={submitting || uploading} type="button"
                className="px-4 py-2 text-sm bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
                {submitting ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Creating...</> : <><Save className="h-4 w-4" />Add Product</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md my-6 shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-sm font-bold text-gray-900">Edit Product</h3>
              <button onClick={() => { setEditingProduct(null); resetForm() }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />{submitError}
                </div>
              )}
              {[['Product Name','text','name'],['Price (R)','number','price'],['Stock Quantity','number','stock_quantity']].map(([label,type,field]) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
                  <input type={type} value={(productForm as any)[field]}
                    onChange={(e) => setProductForm(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea value={productForm.description} rows={3}
                  onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                <select value={productForm.category} onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product Images (up to 6)</label>
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {imageUrls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img src={url} alt={`Preview ${idx+1}`} className="w-full h-20 object-cover rounded-xl border border-gray-200" />
                        <button onClick={() => handleRemoveImage(idx)} type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {imageUrls.length < 6 && (
                  <div onDragOver={(e)=>{e.preventDefault();e.stopPropagation()}} onDragEnter={(e)=>{e.preventDefault();e.stopPropagation()}} onDrop={onDrop}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors">
                    <Image className="h-7 w-7 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-500 mb-1">Drag & drop or</p>
                    <input type="file" accept="image/*" multiple onChange={(e)=>{handleFilesSelected(e.target.files);e.target.value=''}} className="hidden" id="file-input-edit" disabled={uploading} />
                    <label htmlFor="file-input-edit" className={`text-xs font-semibold text-primary-600 cursor-pointer ${uploading?'opacity-50 cursor-not-allowed':''}`}>{uploading?'Uploading...':'Choose Images'}</label>
                    <p className="text-xs text-gray-400 mt-1">{6-imageUrls.length} slots · Max 5MB</p>
                    {uploading && uploadProgress > 0 && <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2"><div className="bg-primary-600 h-1.5 rounded-full transition-all" style={{width:`${uploadProgress}%`}} /></div>}
                  </div>
                )}
                {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
                {imageUrls.length >= 6 && <p className="text-xs text-amber-600 mt-1">Maximum 6 images reached.</p>}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="edit_is_active" checked={productForm.is_active} onChange={(e) => setProductForm(prev => ({ ...prev, is_active: e.target.checked }))} className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
                <span className="text-sm text-gray-700">Active product</span>
              </label>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => { setEditingProduct(null); resetForm() }}
                className="px-4 py-2 text-sm border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleUpdateProduct} disabled={submitting || uploading} type="button"
                className="px-4 py-2 text-sm bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
                {submitting ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Updating...</> : <><Save className="h-4 w-4" />Update Product</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebratory Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => {
              setShowSuccessModal(false)
              resetForm()
            }}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-scale-in">
              {/* Close button */}
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  resetForm()
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Content */}
              <div className="p-8 text-center">
                {/* Animated checkmark circle */}
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6 animate-scale-in-delay">
                  <CheckCircle2 className="h-12 w-12 text-green-600" strokeWidth={2} />
                </div>

                {/* Party popper animation */}
                <div className="mb-4">
                  <PartyPopper className="h-16 w-16 text-yellow-400 mx-auto animate-bounce" />
                </div>

                {/* Success message */}
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  {successMessage || 'Success!'}
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  Your product has been successfully {successMessage.includes('Updated') ? 'updated' : 'created'} and saved to the database.
                </p>
                <p className="text-sm text-gray-500 mb-8">
                  It's now available in your product catalog for IBOs to view and order.
                </p>

                {/* Action button */}
                <button
                  onClick={() => {
                    setShowSuccessModal(false)
                    resetForm()
                  }}
                  className="w-full btn-primary py-3 text-lg font-semibold"
                >
                  Awesome!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-[70] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/80 transition-opacity"
            onClick={closeImageModal}
          />

          {/* Modal with arrows */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative max-w-5xl w-full">
              {/* Close */}
              <button
                onClick={closeImageModal}
                className="absolute -top-10 right-0 text-white/80 hover:text-white"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>

              {/* Image */}
              <div className="bg-black rounded-xl overflow-hidden flex items-center justify-center">
                <img
                  src={modalImages[modalIndex]}
                  alt={`Image ${modalIndex + 1}`}
                  className="max-h-[80vh] w-full object-contain"
                />
              </div>

              {/* Arrows */}
              {modalImages.length > 1 && (
                <>
                  <button
                    onClick={prevModalImage}
                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextModalImage}
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full"
                    aria-label="Next"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Dots */}
              {modalImages.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  {modalImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setModalIndex(i)}
                      className={`h-2 w-2 rounded-full ${i === modalIndex ? 'bg-white' : 'bg-white/40'}`}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
          <p className="text-xs text-gray-400">Built by <a href="https://www.lunexweb.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">lunexweb</a></p>
        </div>
      </footer>
    </div>
  )
}
