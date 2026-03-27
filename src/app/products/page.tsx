'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'
import { 
  Package, 
  ShoppingCart, 
  Filter, 
  Search,
  Plus,
  Minus,
  ArrowLeft,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Info
} from 'lucide-react'
import Link from 'next/link'

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
}

interface CartItem {
  product: Product
  quantity: number
}

export default function ProductsPage() {
  const { user, userProfile, signOut, loading: authLoading } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [categories, setCategories] = useState<string[]>([])
  // Image lightbox state
  const [showImageModal, setShowImageModal] = useState(false)
  const [modalImages, setModalImages] = useState<string[]>([])
  const [modalIndex, setModalIndex] = useState(0)
  // Product details modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  // Cart province for shipping calculation
  const [selectedProvince, setSelectedProvince] = useState<string>('')

  // South African provinces
  const provinces = [
    'Eastern Cape',
    'Free State',
    'Gauteng',
    'KwaZulu-Natal',
    'Limpopo',
    'Mpumalanga',
    'Northern Cape',
    'North West',
    'Western Cape'
  ]

  useEffect(() => {
    fetchProducts()
    // Load cart from localStorage (Phase 1 persistence)
    try {
      const stored = localStorage.getItem('mlm_cart')
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[]
        setCart(parsed)
      }
      // Load saved province if available
      const savedProvince = localStorage.getItem('mlm_selected_province')
      if (savedProvince) {
        setSelectedProvince(savedProvince)
      }
    } catch {}
  }, [])

  useEffect(() => {
    filterProducts()
  }, [products, searchTerm, selectedCategory])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })

      if (error) {
        console.error('Error fetching products:', error)
      } else {
        setProducts(data || [])
        // Extract unique categories
        const uniqueCategories = ['All', ...Array.from(new Set(data?.map(p => p.category) || []))]
        setCategories(uniqueCategories)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterProducts = () => {
    let filtered = products

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    setFilteredProducts(filtered)
  }

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id)
      
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        return [...prevCart, { product, quantity: 1 }]
      }
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    )
  }

  // Persist cart to localStorage when it changes (Phase 1)
  useEffect(() => {
    try {
      localStorage.setItem('mlm_cart', JSON.stringify(cart))
    } catch {}
  }, [cart])

  const getCartSubtotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0)
  }

  const getTaxAmount = () => {
    const subtotal = getCartSubtotal()
    return subtotal * 0.15 // 15% tax
  }

  const getShippingAmount = () => {
    if (!selectedProvince) return 0
    return selectedProvince === 'Gauteng' ? 99.99 : 149.00
  }

  const getCartTotal = () => {
    const subtotal = getCartSubtotal()
    const tax = getTaxAmount()
    const shipping = getShippingAmount()
    return subtotal + tax + shipping
  }

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
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

  const openProductDetails = (product: Product) => {
    setSelectedProduct(product)
    setShowDetailsModal(true)
  }

  const closeProductDetails = () => {
    setShowDetailsModal(false)
    setSelectedProduct(null)
  }

  const handleSignOut = async () => {
    await signOut()
  }

  if (loading || authLoading || (user && !userProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    router.replace('/login')
    return null
  }

  // Gate access: if you have an IBO number, you can browse products
  const isActiveIBO = !!userProfile?.ibo_number
  
  // Debug logging - remove in production
  console.log('Products page access check:', {
    ibo_number: userProfile?.ibo_number,
    status: userProfile?.status,
    isActiveIBO
  })
  
  if (!isActiveIBO) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full card text-center">
          <Package className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">IBO access required</h2>
          <p className="text-gray-600 mb-6">
            Only active IBOs can browse and purchase products. Become an IBO to continue.
          </p>
          <div className="flex justify-center">
            <Link href="/signup" className="btn-primary">Become an IBO</Link>
          </div>
        </div>
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
                <h1 className="text-base font-semibold text-gray-900 leading-tight">Products</h1>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">← Dashboard</Link>
              <button onClick={handleSignOut} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
                <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Search and Filter */}
        <div className="mb-5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Search products..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white" />
            </div>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
              className="sm:w-48 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              // Get product images - check image_urls first, fallback to image_url
              const productImages = (product.image_urls && product.image_urls.length > 0)
                ? product.image_urls
                : (product.image_url ? [product.image_url] : [])
              const mainImage = productImages[0]

              return (
              <div key={product.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow duration-200 flex flex-col overflow-hidden">
                <div className="relative">
                  <div className="w-full h-44 bg-gray-50 flex items-center justify-center relative group">
                    {mainImage ? (
                      <>
                        <Image
                          src={mainImage}
                          alt={product.name}
                          width={192}
                          height={192}
                          className="w-full h-full object-contain rounded-lg cursor-pointer"
                          onClick={() => openImageModal(productImages, 0)}
                          unoptimized
                        />
                        {productImages.length > 1 && (
                          <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <button 
                              className="bg-black/40 hover:bg-black/60 text-white p-1 rounded-full pointer-events-auto"
                              onClick={(e) => { e.stopPropagation(); openImageModal(productImages, (productImages.length - 1)); }}
                              aria-label="Previous image"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button 
                              className="bg-black/40 hover:bg-black/60 text-white p-1 rounded-full pointer-events-auto"
                              onClick={(e) => { e.stopPropagation(); openImageModal(productImages, 1); }}
                              aria-label="Next image"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <Package className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 leading-snug">{product.name}</h3>
                  <p className="text-gray-500 text-xs mb-3 line-clamp-2 flex-1 leading-relaxed">{product.description}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base font-bold text-primary-600">
                      {formatCurrency(product.price)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {product.stock_quantity > 0 ? `${product.stock_quantity} left` : 'Out of stock'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-1.5 p-3 pt-0 mt-auto">
                  <button
                    onClick={() => openProductDetails(product)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-2 text-xs font-semibold border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Info className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Details</span>
                  </button>
                  <button
                    onClick={() => {
                      if (userProfile?.status === 'active') {
                        addToCart(product)
                      }
                    }}
                    disabled={product.stock_quantity === 0 || userProfile?.status !== 'active'}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-2 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ShoppingCart className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">
                      {product.stock_quantity === 0 ? 'Sold Out' :
                       userProfile?.status !== 'active' ? 'Inactive' : 'Add'}
                    </span>
                  </button>
                </div>
              </div>
              )
            })
          )}
        </div>

        {/* Shopping Cart Sidebar */}
        {cart.length > 0 && cartOpen && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Shopping Cart</h3>
                <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded-full">
                  {getCartItemCount()}
                </span>
              </div>

              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{item.product.name}</h4>
                      <p className="text-xs text-gray-600">{formatCurrency(item.product.price)} each</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4">
                {/* Province Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Province for Shipping
                  </label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  >
                    <option value="">-- Select Province --</option>
                    {provinces.map(province => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                </div>

                {/* Order Summary Breakdown */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-gray-900 font-medium">
                      {formatCurrency(getCartSubtotal())}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Tax (15%):</span>
                    <span className="text-gray-900 font-medium">
                      {formatCurrency(getTaxAmount())}
                    </span>
                  </div>

                  {selectedProvince && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Shipping:</span>
                      <span className="text-gray-900 font-medium">
                        {formatCurrency(getShippingAmount())}
                      </span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="border-t border-gray-200 pt-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-primary-600">
                      {formatCurrency(getCartTotal())}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    className="flex-1 btn-secondary"
                    onClick={() => setCartOpen(false)}
                  >
                    Continue shopping
                  </button>
                  <button
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!selectedProvince}
                    onClick={() => {
                      try {
                        localStorage.setItem('mlm_cart', JSON.stringify(cart))
                        localStorage.setItem('mlm_selected_province', selectedProvince)
                      } catch {}
                      router.push('/checkout')
                    }}
                  >
                    Checkout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {cart.length > 0 && !cartOpen && (
          <button
            onClick={() => setCartOpen(true)}
            className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg bg-primary-600 text-white w-14 h-14 flex items-center justify-center"
            aria-label="Open cart"
            title="Open cart"
          >
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -top-2 -right-2 bg-white text-primary-700 text-xs font-bold rounded-full px-1">
                {getCartItemCount()}
              </span>
            </div>
          </button>
        )}

      {/* Image Lightbox Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-[70] overflow-y-auto overflow-x-visible">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/80 transition-opacity"
            onClick={closeImageModal}
          />

          {/* Modal with arrows */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative max-w-5xl w-full">
              {/* Close button */}
              <button
                onClick={closeImageModal}
                className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors z-10"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>

              {/* Image container */}
              <div className="bg-black rounded-xl overflow-hidden flex items-center justify-center">
                <Image
                  src={modalImages[modalIndex]}
                  alt={`Image ${modalIndex + 1}`}
                  width={1200}
                  height={800}
                  className="max-h-[80vh] w-full object-contain"
                  unoptimized
                />
              </div>

              {/* Navigation arrows */}
              {modalImages.length > 1 && (
                <>
                  <button
                    onClick={prevModalImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextModalImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
                    aria-label="Next"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Image indicators (dots) */}
              {modalImages.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  {modalImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setModalIndex(i)}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        i === modalIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
                      }`}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {showDetailsModal && selectedProduct && (
        <div className="fixed inset-0 z-[70] overflow-y-auto overflow-x-visible">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/80 transition-opacity"
            onClick={closeProductDetails}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Close button */}
              <button
                onClick={closeProductDetails}
                className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white rounded-full p-2 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>

              {/* Content - Scrollable */}
              <div className="overflow-y-auto flex-1 p-6">
                {/* Product Images */}
                {(() => {
                  const productImages = (selectedProduct.image_urls && selectedProduct.image_urls.length > 0)
                    ? selectedProduct.image_urls
                    : (selectedProduct.image_url ? [selectedProduct.image_url] : [])
                  const mainImage = productImages[0]
                  
                  return (
                    <div className="mb-6">
                      {mainImage ? (
                        <div className="rounded-lg overflow-hidden bg-gray-100 mb-4">
                          <Image
                            src={mainImage}
                            alt={selectedProduct.name}
                            width={512}
                            height={256}
                            className="w-full h-64 object-contain cursor-pointer"
                            onClick={() => {
                              if (productImages.length > 0) {
                                closeProductDetails()
                                openImageModal(productImages, 0)
                              }
                            }}
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="h-16 w-16 text-gray-400" />
                        </div>
                      )}

                      {/* Image Thumbnails */}
                      {productImages.length > 1 && (
                        <div className="mobile-grid-cols-4 gap-2">
                          {productImages.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                closeProductDetails()
                                openImageModal(productImages, idx)
                              }}
                              className="relative group rounded-lg overflow-hidden border-2 border-transparent hover:border-primary-500 transition-colors"
                            >
                              <Image
                                src={img}
                                alt={`${selectedProduct.name} ${idx + 1}`}
                                width={80}
                                height={80}
                                className="w-full h-20 object-cover"
                                unoptimized
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Product Info */}
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h2>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-primary-100 text-primary-800">
                      {selectedProduct.category}
                    </span>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                      selectedProduct.stock_quantity > 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedProduct.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-primary-600 mb-2">
                      {formatCurrency(selectedProduct.price)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Stock Available: <span className="font-semibold">{selectedProduct.stock_quantity} units</span>
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {selectedProduct.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer with Actions */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="flex gap-3">
                  <button
                    onClick={closeProductDetails}
                    className="flex-1 btn-secondary"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      addToCart(selectedProduct)
                      closeProductDetails()
                    }}
                    disabled={selectedProduct.stock_quantity === 0}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {selectedProduct.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
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
