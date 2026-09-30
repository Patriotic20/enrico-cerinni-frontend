import { useState, useEffect, useCallback, useRef } from 'react';
import { productsAPI } from '../api';
import { toArray } from '../utils/api';
import { isBarcode } from '../utils/barcode';
import { SEARCH_CONFIG } from '../utils/constants';

// skipBarcodes: the POS resolves scans by exact SKU first and only text-searches
// on a miss, so a scan doesn't fire both requests.
export const useProductSearch = ({ skipBarcodes = false } = {}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  // Only the latest request may write results — a slow earlier search must
  // not overwrite what the cashier typed since.
  const requestIdRef = useRef(0);
  // Default list, kept so clearing the input after each scan doesn't refetch it.
  const recentRef = useRef(null);

  const load = useCallback(async (params) => {
    const id = ++requestIdRef.current;
    setSearchLoading(true);
    try {
      const response = await productsAPI.getProducts({ page: 1, size: SEARCH_CONFIG.MAX_LIMIT, ...params });
      const items = response.success ? toArray(response.data) : [];
      if (id === requestIdRef.current) setSearchResults(items);
      return items;
    } catch (error) {
      console.error('Error loading products:', error);
      if (id === requestIdRef.current) setSearchResults([]);
      return [];
    } finally {
      if (id === requestIdRef.current) setSearchLoading(false);
    }
  }, []);

  const searchProducts = useCallback((term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    return load({ search: term });
  }, [load]);

  const getRecentProducts = useCallback(async () => {
    const items = await load({ sort_by: 'created_at', sort_order: 'desc' });
    if (items.length) recentRef.current = items; // a failed load must not cache an empty grid
  }, [load]);

  useEffect(() => { getRecentProducts(); }, [getRecentProducts]);

  // Debounced search. An empty term shows the cached default list (null while
  // its fetch is in flight).
  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) {
      if (recentRef.current) {
        requestIdRef.current++; // drop any in-flight search
        setSearchResults(recentRef.current);
        setSearchLoading(false);
      }
      return;
    }
    if (skipBarcodes && isBarcode(term)) return;

    const timeoutId = setTimeout(() => searchProducts(term), SEARCH_CONFIG.DEBOUNCE_DELAY);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchProducts, skipBarcodes]);

  // Back to the default list, refetched so stock sold in the finished sale shows.
  const clearSearch = useCallback(() => {
    recentRef.current = null;
    getRecentProducts();
    setSearchTerm('');
  }, [getRecentProducts]);

  return {
    searchTerm,
    searchResults,
    searchLoading,
    isSearchFocused,
    setSearchTerm,
    setIsSearchFocused,
    clearSearch,
    searchProducts,
    getRecentProducts,
  };
};
