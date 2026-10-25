import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { FilterBar } from './components/FilterBar';
import { UploadDropzone } from './components/UploadDropzone';
import { ScreenshotGrid } from './components/ScreenshotGrid';
import { PreviewModal } from './components/PreviewModal';
import { ToastContainer } from './components/Toast';
import {
  searchScreenshotsApi,
  deleteScreenshotApi,
  getStatsApi,
} from './services/api';

export function App() {
  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTag, setSelectedTag] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Data state
  const [screenshots, setScreenshots] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    categories: {},
    tags: [],
  });

  // UI state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Toast helper
  const addToast = useCallback((title, message, type = 'success') => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, title, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 300ms Debounce for instant search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
      setPage(1); // Reset to page 1 on new search query
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch stats (total counts, categories, tags)
  const fetchStats = useCallback(async () => {
    try {
      const data = await getStatsApi();
      if (data.success) {
        setStats({
          total: data.total || 0,
          categories: data.categories || {},
          tags: data.tags || [],
        });
      }
    } catch (err) {
      console.warn('Failed to load stats:', err.message);
    }
  }, []);

  // Fetch screenshots based on query, filters, and pagination
  const fetchScreenshots = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await searchScreenshotsApi({
        q: debouncedQuery,
        category: selectedCategory,
        tag: selectedTag,
        from: dateFrom,
        to: dateTo,
        page,
        limit: 12,
      });

      if (data.success) {
        setScreenshots(data.screenshots || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching screenshots:', err);
      addToast('Search Error', err.message || 'Could not fetch screenshots', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, selectedCategory, selectedTag, dateFrom, dateTo, page, addToast]);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Load results whenever query, filters, or page changes
  useEffect(() => {
    fetchScreenshots();
  }, [fetchScreenshots]);

  // Handlers
  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setPage(1);
  };

  const handleTagSelect = (tag) => {
    setSelectedTag(tag);
    setPage(1);
  };

  const handleDateRangeChange = (from, to) => {
    setDateFrom(from);
    setDateTo(to);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedQuery('');
    setSelectedCategory('All');
    setSelectedTag('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleUploadSuccess = (response) => {
    fetchStats();
    fetchScreenshots();

    if (response.duplicate) {
      addToast(
        'Duplicate Skipped',
        'This exact screenshot was already in your library.',
        'warning'
      );
    } else {
      addToast(
        'Screenshot Processed',
        `Extracted OCR text and categorized as [${response.screenshot?.category || 'Other'}].`,
        'success'
      );
    }
  };

  const handleDeleteScreenshot = async (id) => {
    try {
      await deleteScreenshotApi(id);
      addToast(
        'Deleted',
        'Screenshot removed from Cloudinary and your library.',
        'success'
      );
      fetchStats();
      fetchScreenshots();
    } catch (err) {
      addToast('Delete Failed', err.message, 'error');
      throw err;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Top Navigation */}
      <Header
        totalCount={stats.total}
        isUploadOpen={isUploadOpen}
        onToggleUpload={() => setIsUploadOpen(!isUploadOpen)}
      />

      <main className="flex-1 pb-16">
        {/* Upload Drawer / Dropzone */}
        <UploadDropzone
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={handleUploadSuccess}
        />

        {/* Big Search Bar */}
        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          onClear={() => setSearchInput('')}
          isLoading={isLoading}
          totalResults={totalCount}
          isSearching={Boolean(debouncedQuery)}
        />

        {/* Filter Bar */}
        <FilterBar
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
          selectedTag={selectedTag}
          onSelectTag={handleTagSelect}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChangeDateRange={handleDateRangeChange}
          onClearFilters={handleClearFilters}
          categoryCounts={stats.categories}
          availableTags={stats.tags}
          totalCount={stats.total}
        />

        {/* Results Grid */}
        <ScreenshotGrid
          screenshots={screenshots}
          isLoading={isLoading}
          searchQuery={debouncedQuery}
          onCardClick={(sc) => setActiveScreenshot(sc)}
          onOpenUpload={() => setIsUploadOpen(true)}
          onClearSearch={handleClearFilters}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          total={totalCount}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>
          ishot &bull; Searchable Screenshot Library &bull; Built with Cloudinary OCR & AI Content Analysis &bull; Tech for Social Good
        </p>
      </footer>

      {/* Modal Preview */}
      {activeScreenshot && (
        <PreviewModal
          screenshot={activeScreenshot}
          onClose={() => setActiveScreenshot(null)}
          onDelete={handleDeleteScreenshot}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
