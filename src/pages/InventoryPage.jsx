import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, X, Printer } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import Table from '../components/tables/Table';
import Button from '../components/ui/Button';
import { LoadingSpinner, Card } from '../components/ui';
import Input from '../components/forms/Input';
import Modal from '../components/modals/Modal';
import ProductForm from '../components/forms/ProductForm';
import ProductVariantForm from '../components/forms/ProductVariantForm';
import { productsAPI, brandsAPI, colorsAPI, seasonsAPI, sizesAPI, productVariantsAPI, settingsAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { toArray } from '../utils/api';
import { SEARCH_CONFIG } from '../utils/constants';
import { cn } from '../utils/cn';
import { formatNumber } from '../utils/format';
import { summarizeVariants } from '../utils/stock';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../utils/api';

// Simple cache for filter options
const filterCache = {
  brands: null,
  categories: null,
  seasons: null,
  colors: null,
  sizes: null,
  timestamp: null,
  isExpired: function() {
    // Cache expires after 5 minutes
    return !this.timestamp || Date.now() - this.timestamp > 5 * 60 * 1000;
  }
};

const EMPTY_PAGINATION = { page: 1, size: 0, total: 0, pages: 0 };

// Custom hook for inventory data management
const useInventoryData = () => {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  // Total ignoring filters, used for the "all products" counter in the header.
  // Only refreshed on unfiltered queries so filtering does not rewrite it.
  const [totalProducts, setTotalProducts] = useState(0);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [error, setError] = useState(null);

  // Remembers the last query so mutations can reload the very same page.
  const lastQueryRef = useRef({ page: 1, size: SEARCH_CONFIG.DEFAULT_LIMIT });
  // Guards against a slow response for stale filters overwriting a newer one.
  const requestIdRef = useRef(0);

  /**
   * Fetch a single page from the server.
   *
   * Filtering, searching and paging all happen server-side: the page only ever
   * holds the rows it displays, so inventory size no longer drives load time.
   */
  const loadProducts = useCallback(async (query = {}) => {
    const params = { page: 1, size: SEARCH_CONFIG.DEFAULT_LIMIT, ...query };
    lastQueryRef.current = params;

    const requestId = ++requestIdRef.current;

    try {
      setProductsLoading(true);
      setError(null);

      const response = await productsAPI.getProducts(params);

      // A newer request has been issued in the meantime — drop this result.
      if (requestId !== requestIdRef.current) return;

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch products');
      }

      const items = toArray(response.data);
      const pageInfo = response.data?.pagination || {
        ...EMPTY_PAGINATION,
        page: params.page,
        size: params.size,
        total: items.length,
        pages: 1,
      };

      setProducts(items);
      setPagination(pageInfo);

      const isUnfiltered = !params.search && !params.brand_id && !params.season_id && !params.category_id;
      if (isUnfiltered) {
        setTotalProducts(pageInfo.total ?? items.length);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Error loading products:', err);
      setError('Mahsulotlarni yuklashda xatolik yuz berdi');
      setProducts([]);
      setPagination(EMPTY_PAGINATION);
    } finally {
      if (requestId === requestIdRef.current) {
        setProductsLoading(false);
      }
    }
  }, []);

  // Load filter options (non-critical data)
  const loadFilterOptions = useCallback(async () => {
    try {
      setFiltersLoading(true);
      
      // Check if we have cached data that's not expired
      if (!filterCache.isExpired() && filterCache.brands) {
        setBrands(filterCache.brands);
        setCategories(filterCache.categories);
        setSeasons(filterCache.seasons);
        setColors(filterCache.colors);
        setSizes(filterCache.sizes);
        setFiltersLoading(false);
        return;
      }
      
      // Load filter options in parallel
      const [brandsRes, categoriesRes, seasonsRes, colorsRes, sizesRes] = await Promise.all([
        brandsAPI.getBrands(),
        settingsAPI.getCategories(),
        seasonsAPI.getSeasons(),
        colorsAPI.getColors(),
        sizesAPI.getSizes()
      ]);

      // Update state and cache. toArray keeps a changed response shape from
      // taking the page down: these values are rendered with .map below.
      if (brandsRes.success) {
        filterCache.brands = toArray(brandsRes.data);
        setBrands(filterCache.brands);
      }
      if (categoriesRes.success) {
        filterCache.categories = toArray(categoriesRes.data);
        setCategories(filterCache.categories);
      }
      if (seasonsRes.success) {
        filterCache.seasons = toArray(seasonsRes.data);
        setSeasons(filterCache.seasons);
      }
      if (colorsRes.success) {
        filterCache.colors = toArray(colorsRes.data);
        setColors(filterCache.colors);
      }
      if (sizesRes.success) {
        filterCache.sizes = toArray(sizesRes.data);
        setSizes(filterCache.sizes);
      }
      
      // Update cache timestamp
      filterCache.timestamp = Date.now();
    } catch (err) {
      console.error('Error loading filter options:', err);
      // Don't set error for filter options as they're not critical
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  /** Re-run the last query, e.g. after a product was created or deleted. */
  const refreshProducts = useCallback(async () => {
    await loadProducts(lastQueryRef.current);
  }, [loadProducts]);

  return {
    products,
    pagination,
    totalProducts,
    brands,
    categories,
    seasons,
    colors,
    sizes,
    productsLoading,
    filtersLoading,
    loading: productsLoading, // Keep backward compatibility
    error,
    loadProducts,
    loadFilterOptions,
    refreshProducts,
    setProducts
  };
};

// Custom hook for filtering and pagination
const useProductFilters = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Typing must not fire one request per keystroke. The page reset is applied
  // in the same update as the new term, so the two together cause a single
  // re-render — and therefore a single request.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, SEARCH_CONFIG.DEBOUNCE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Changing a filter invalidates the current page number. Batching both state
  // updates in one handler avoids a wasted request for "old page + new filter".
  const changeBrand = useCallback((value) => {
    setSelectedBrand(value);
    setCurrentPage(1);
  }, []);

  const changeSeason = useCallback((value) => {
    setSelectedSeason(value);
    setCurrentPage(1);
  }, []);

  const changeCategory = useCallback((value) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  }, []);

  /** Query parameters for GET /products/, rebuilt whenever a filter changes. */
  const queryParams = useMemo(() => {
    const params = { page: currentPage, size: pageSize };

    if (debouncedSearch) params.search = debouncedSearch;
    if (selectedBrand !== 'all') params.brand_id = Number(selectedBrand);
    if (selectedSeason !== 'all') params.season_id = Number(selectedSeason);
    if (selectedCategory !== 'all') params.category_id = Number(selectedCategory);

    return params;
  }, [currentPage, pageSize, debouncedSearch, selectedBrand, selectedSeason, selectedCategory]);

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    selectedBrand !== 'all' ||
    selectedSeason !== 'all' ||
    selectedCategory !== 'all';

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedBrand('all');
    setSelectedSeason('all');
    setSelectedCategory('all');
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    selectedBrand,
    setSelectedBrand: changeBrand,
    selectedSeason,
    setSelectedSeason: changeSeason,
    selectedCategory,
    setSelectedCategory: changeCategory,
    currentPage,
    pageSize,
    queryParams,
    hasActiveFilters,
    resetFilters,
    handlePageChange,
    handlePageSizeChange
  };
};

const summarizeStock = (product) => (
  product.variants?.length
    ? summarizeVariants(product.variants)
    : { total: product.stock_quantity || 0, count: 0, low: 0, out: 0 }
);

const uniqueBy = (items, key) => {
  const seen = new Map();
  for (const item of items) {
    if (item[key] && !seen.has(item[key])) seen.set(item[key], item);
  }
  return [...seen.values()];
};

const InventoryHeader = ({ totalProducts, shownCount, filtered, onAddProduct, loading }) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 className="text-xl font-bold text-gray-900 m-0">Inventar</h1>
      <p className="text-sm text-gray-500 m-0">
        {filtered ? `${shownCount} ta topildi · jami ${totalProducts}` : `${totalProducts} ta mahsulot`}
      </p>
    </div>
    <Button onClick={onAddProduct} disabled={loading} className="whitespace-nowrap">
      <Plus size={16} className="mr-1" />
      Mahsulot qo'shish
    </Button>
  </div>
);

// Loading component similar to checkout
const InventoryLoading = ({ message = "Inventar yuklanmoqda..." }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LoadingSpinner
      message={message}
      size="lg"
    />
  </div>
);

const ProductsSkeleton = () => (
  <Card padding="none" className="overflow-hidden">
    <div className="animate-pulse divide-y divide-gray-100">
      {[...Array(6)].map((_, idx) => (
        <div key={idx} className="flex items-center gap-6 px-6 py-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-100 rounded w-1/3" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-28" />
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  </Card>
);

export default function InventoryPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const confirm = useConfirm();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState(null);

  const {
    products,
    pagination,
    totalProducts,
    brands,
    categories,
    seasons,
    colors,
    sizes,
    productsLoading,
    filtersLoading,
    loading,
    error,
    loadProducts,
    loadFilterOptions,
    refreshProducts
  } = useInventoryData();

  const {
    searchTerm,
    setSearchTerm,
    selectedBrand,
    setSelectedBrand,
    selectedSeason,
    setSelectedSeason,
    selectedCategory,
    setSelectedCategory,
    currentPage,
    pageSize,
    queryParams,
    hasActiveFilters,
    resetFilters,
    handlePageChange,
    handlePageSizeChange
  } = useProductFilters();

  const authorized = !authLoading && isAuthenticated();

  // Handle authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated()) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Filter options are static reference data — fetched once.
  useEffect(() => {
    if (authorized) loadFilterOptions();
  }, [authorized, loadFilterOptions]);

  // Every filter or page change turns into exactly one server query.
  useEffect(() => {
    if (authorized) loadProducts(queryParams);
  }, [authorized, queryParams, loadProducts]);

  // Deleting the last row of the last page leaves the current page past the
  // end of the result set — step back so the table never renders empty.
  useEffect(() => {
    if (!productsLoading && pagination.pages > 0 && currentPage > pagination.pages) {
      handlePageChange(pagination.pages);
    }
  }, [productsLoading, pagination.pages, currentPage, handlePageChange]);

  // One save at a time: a double tap on "Saqlash" created duplicate products.
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const guard = (fn) => async (...args) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try { return await fn(...args); } finally { savingRef.current = false; setSaving(false); }
  };

  const handleAddProduct = useCallback(async (productData) => {
    try {
      const response = await productsAPI.createProduct(productData);
      if (response.success && response.data) {
        setNewProduct(response.data);
        setShowAddModal(false);
        setShowVariantModal(true);
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Mahsulot qo\'shishda xatolik yuz berdi');
    }
  }, []);

  const handleCreateVariants = useCallback(async (variantData) => {
    try {
      const response = await productVariantsAPI.createProductVariantsBulk(variantData);
      if (response.success) {
        setShowVariantModal(false);
        setNewProduct(null);
        await refreshProducts();
      }
    } catch (error) {
      console.error('Error creating variants:', error);
      toast.error('Variantlarni yaratishda xatolik yuz berdi');
    }
  }, [refreshProducts]);

  // Mutations reload the current page instead of patching the local array:
  // with server-side paging the row set and the total both live on the server.
  const handleEditProduct = useCallback(async (productData) => {
    try {
      const response = await productsAPI.updateProduct(editingProduct.id, productData);
      if (response.success) {
        setEditingProduct(null);
        await refreshProducts();
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Mahsulotni yangilashda xatolik yuz berdi');
    }
  }, [editingProduct, refreshProducts]);

  const handleDeleteProduct = useCallback(async (productId) => {
    const confirmed = await confirm({
      title: 'Mahsulotni o\'chirish',
      message: 'Bu mahsulotni o\'chirishni xohlaysizmi?',
      description: 'Mahsulot va uning barcha variantlari o\'chiriladi. Bu amalni qaytarib bo\'lmaydi.',
      confirmText: 'Ha, o\'chirish',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const response = await productsAPI.deleteProduct(productId);
      if (response.success) {
        await refreshProducts();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(getApiErrorMessage(error, 'Mahsulotni o\'chirishda xatolik yuz berdi'));
    }
  }, [refreshProducts, confirm]);

  const handleViewProduct = useCallback((product) => {
    navigate(`/inventory/${product.id}`);
  }, [navigate]);

  const getRowClassName = useCallback((product) => (
    summarizeStock(product).total === 0 ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-gray-50'
  ), []);

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Mahsulot',
      width: '28%',
      render: (value, product) => (
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">{value}</div>
          <div className="text-xs text-gray-500 truncate">
            <span className="font-mono">{product.sku}</span>
            {product.category_name && <> · {product.category_name}</>}
          </div>
        </div>
      )
    },
    {
      key: 'brand_name',
      label: 'Brend / Fasl',
      width: '16%',
      render: (value, product) => (
        <div className="min-w-0">
          <div className="text-sm text-gray-800 truncate">{value || '—'}</div>
          <div className="text-xs text-gray-500 truncate">{product.season_name || '—'}</div>
        </div>
      )
    },
    {
      key: 'variants',
      label: 'Rang / O\'lcham',
      width: '18%',
      render: (_, product) => {
        const variants = product.variants || [];
        if (variants.length === 0) return <span className="text-xs text-gray-500">Variant yo'q</span>;
        const colorsList = uniqueBy(variants, 'color_name');
        const sizesList = uniqueBy(variants, 'size_name').map(v => v.size_name);
        return (
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1">
              {colorsList.slice(0, 6).map(v => (
                <span
                  key={v.color_name}
                  title={v.color_name}
                  className="w-3.5 h-3.5 rounded-full border border-gray-300"
                  style={{ backgroundColor: v.color_hex || '#e5e7eb' }}
                />
              ))}
              {colorsList.length > 6 && <span className="text-xs text-gray-500">+{colorsList.length - 6}</span>}
            </div>
            <div className="text-xs text-gray-500 truncate" title={sizesList.join(', ')}>
              {sizesList.join(', ')}
            </div>
          </div>
        );
      }
    },
    {
      key: 'price',
      label: 'Narx (UZS)',
      width: '16%',
      render: (value, product) => {
        const prices = (product.variants || []).map(v => Number(v.price));
        if (prices.length === 0) prices.push(Number(value) || 0);
        const min = Math.round(Math.min(...prices));
        const max = Math.round(Math.max(...prices));
        return (
          <span className="text-sm font-medium text-gray-900 whitespace-nowrap tabular-nums">
            {min === max ? formatNumber(min) : `${formatNumber(min)} – ${formatNumber(max)}`}
          </span>
        );
      }
    },
    {
      key: 'stock_quantity',
      label: 'Qoldiq',
      width: '12%',
      render: (_, product) => {
        const { total, count, low, out } = summarizeStock(product);
        let status;
        if (total === 0) status = <span className="text-red-600">Tugagan</span>;
        else if (out > 0) status = <span className="text-red-600">{out} ta variant tugagan</span>;
        else if (low > 0) status = <span className="text-amber-600">{low} ta variant kam</span>;
        else status = <span className="text-gray-500">{count} variant</span>;
        return (
          <div className="whitespace-nowrap">
            <div className="text-sm font-semibold text-gray-900 tabular-nums">{formatNumber(total)} dona</div>
            <div className="text-xs">{status}</div>
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: '',
      width: '10%',
      // Row clicks open the product, so action buttons must stop propagation —
      // otherwise deleting a row also navigates away to that row's detail page.
      render: (_, product) => (
        <div className="flex items-center justify-end gap-1">
          <button
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            onClick={(e) => { e.stopPropagation(); handleViewProduct(product); }}
            title="Ko'rish"
            aria-label="Ko'rish"
          >
            <Eye size={16} />
          </button>
          <button
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={(e) => { e.stopPropagation(); navigate(`/labels?product=${product.id}`); }}
            title="Shtrix-kod chop etish"
            aria-label="Shtrix-kod chop etish"
          >
            <Printer size={16} />
          </button>
          <button
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={(e) => { e.stopPropagation(); setEditingProduct(product); }}
            title="Tahrirlash"
            aria-label="Tahrirlash"
          >
            <Edit size={16} />
          </button>
          <button
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
            title="O'chirish"
            aria-label="O'chirish"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ], [handleViewProduct, handleDeleteProduct, navigate]);

  if (authLoading) {
    return (
        <PageLayout>
          <InventoryLoading message="Autentifikatsiya tekshirilmoqda..." />
        </PageLayout>
    );
  }

  if (error) {
    return (
        <PageLayout>
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <p className="text-red-600 text-center">{error}</p>
            <Button onClick={() => loadProducts(queryParams)}>Qayta urinish</Button>
          </div>
        </PageLayout>
    );
  }

  const selectClass = 'px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50';

  return (
      <PageLayout maxWidth="full" spacing="sm">
        <div className="space-y-4">
          <InventoryHeader
            totalProducts={totalProducts}
            shownCount={pagination.total}
            filtered={hasActiveFilters}
            onAddProduct={() => setShowAddModal(true)}
            loading={productsLoading}
          />

          {/* Toolbar: search + filters in one row */}
          <Card padding="sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <Input
                  placeholder="Nomi, SKU yoki brend bo'yicha qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 py-2"
                />
              </div>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className={selectClass} disabled={filtersLoading} aria-label="Kategoriya">
                <option value="all">Barcha kategoriyalar</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className={selectClass} disabled={filtersLoading} aria-label="Brend">
                <option value="all">Barcha brendlar</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} className={selectClass} disabled={filtersLoading} aria-label="Fasl">
                <option value="all">Barcha fasllar</option>
                {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))} className={selectClass} aria-label="Sahifadagi soni">
                {[10, 20, 50].map(n => <option key={n} value={n}>{n} ta</option>)}
              </select>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  <X size={14} /> Tozalash
                </button>
              )}
            </div>
          </Card>

          {productsLoading ? (
            <ProductsSkeleton />
          ) : (
            <Card padding="none" className="overflow-hidden">
              <Table
                columns={columns}
                data={products}
                className="rounded-lg"
                onRowClick={handleViewProduct}
                pagination={true}
                pageSize={pageSize}
                currentPage={currentPage}
                onPageChange={handlePageChange}
                totalItems={pagination.total}
                getRowClassName={getRowClassName}
                highlightRows={true}
                emptyMessage={hasActiveFilters ? 'Filtrga mos mahsulot topilmadi' : 'Hali mahsulot qo\'shilmagan'}
              />
            </Card>
          )}
        </div>

        {/* Product Creation Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Yangi mahsulot qo'shish"
          size="large"
        >
          <ProductForm
            product={null}
            brands={brands || []}
            categories={categories || []}
            seasons={seasons || []}
            onSubmit={guard(handleAddProduct)}
            loading={saving}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>

        {/* Product Variant Creation Modal */}
        <Modal
          isOpen={showVariantModal}
          onClose={() => {
            setShowVariantModal(false);
            setNewProduct(null);
          }}
          title="Mahsulot variantlarini yaratish"
          size="2xl"
        >
          <ProductVariantForm
            product={newProduct}
            colors={colors}
            sizes={sizes}
            onSubmit={guard(handleCreateVariants)}
            loading={saving}
            onCancel={() => {
              setShowVariantModal(false);
              setNewProduct(null);
            }}
          />
        </Modal>

        {/* Product Edit Modal */}
        <Modal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          title="Mahsulotni tahrirlash"
          size="large"
        >
          <ProductForm
            product={editingProduct}
            brands={brands || []}
            categories={categories || []}
            seasons={seasons || []}
            onSubmit={guard(handleEditProduct)}
            loading={saving}
            onCancel={() => setEditingProduct(null)}
          />
        </Modal>
      </PageLayout>
  );
} 