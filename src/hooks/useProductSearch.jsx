import { useState, useEffect, useCallback } from 'react';
import { productsAPI } from '../api';
import { toArray } from '../utils/api';
import { SEARCH_CONFIG } from '../utils/constants';

export const useProductSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchProducts = useCallback(async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await productsAPI.getProducts({ 
        search: term, 
        page: 1,
        size: SEARCH_CONFIG.MAX_LIMIT // Use MAX_LIMIT for search to show more results
      });
      
      setSearchResults(response.success ? toArray(response.data) : []);
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const getRecentProducts = useCallback(async () => {
    setSearchLoading(true);
    try {
      const response = await productsAPI.getProducts({ 
        page: 1,
        size: SEARCH_CONFIG.MAX_LIMIT, // Use MAX_LIMIT to show more recent products
        sort_by: 'created_at',
        sort_order: 'desc'
      });

      setSearchResults(response.success ? toArray(response.data) : []);
    } catch (error) {
      console.error('Error loading recent products:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounced search effect. It also covers the initial load (empty term falls
  // through to getRecentProducts), so no separate mount effect is needed —
  // having both fired the same request twice on every mount.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchProducts(searchTerm);
      } else {
        getRecentProducts();
      }
    }, SEARCH_CONFIG.DEBOUNCE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchProducts, getRecentProducts]);

  // Back to the default list. Emptying the results left a blank grid when the
  // term was already '' (the effect above never re-fired); reloading also
  // picks up stock changed by the sale that just finished.
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    getRecentProducts();
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