import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { FilterBar } from './components/FilterBar';
import { UploadDropzone } from './components/UploadDropzone';
import { ScreenshotGrid } from './components/ScreenshotGrid';
import { PreviewModal } from './components/PreviewModal';
import { ToastContainer } from './components/Toast';
import { AuthPage } from './components/AuthPage';
import { useAuth } from './context/AuthContext';
import {
  searchScreenshotsApi,
  deleteScreenshotApi,
  getStatsApi,
} from './services/api';
import { Loader2 } from 'lucide-react';

export function App() {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();

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
  const [isLoading, setIsLoading] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    categories: {},
    tags: [],
    maxUploads: 25,
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

  // Clear all cached screenshot state on logout
  const handleLogout = useCallback(() => {
    setScreenshots([]);
    setTotalCount(0);
    setTotalPages(1);
    setSearchInput('');
    setDebouncedQuery('');
    setSelectedCategory('All');
    setSelectedTag('');
    setDateFrom('');
    setDateTo('');
    setStats({ total: 0, categories: {}, tags: [], maxUploads: 25 });
    setActiveScreenshot(null);
    setIsUploadOpen(false);
  }, []);

  // 300ms Debounce for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch stats (total counts, categories, tags)
  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await getStatsApi();
      if (data.success) {
        setStats({
          total: data.total || 0,
          categories: data.categories || {},
          tags: data.tags || [],
          maxUploads: data.maxUploads || 25,
        });
      }
    } catch (err) {
      console.warn('Failed to load stats:', err.message);
    }
  }, [isAuthenticated]);

  // Fetch screenshots based on query, filters, and pagination
  const fetchScreenshots = useCallback(async () => {
    if (!isAuthenticated) return;
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
      if (err.message && !err.message.includes('Session expired')) {
        addToast('Search Error', err.message || 'Could not fetch screenshots', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, debouncedQuery, selectedCategory, selectedTag, dateFrom, dateTo, page, addToast]);

  // Initial load when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchScreenshots();
    } else {
      handleLogout();
    }
  }, [isAuthenticated, fetchStats, fetchScreenshots, handleLogout]);

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

  const handleUploadError = (errorMsg) => {
    if (errorMsg.includes('limit') || errorMsg.includes('429')) {
      addToast(
        'Upload Cap Reached',
        'You have reached your 25 screenshot limit. Delete existing screenshots to upload new ones.',
        'error'
      );
    } else {
      addToast('Upload Failed', errorMsg, 'error');
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

  // If initial auth check is resolving
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">
          Loading ishot vault...
        </p>
      </div>
    );
  }

  // Protect main app: show login page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Top Navigation */}
      <Header
        totalCount={stats.total}
        isUploadOpen={isUploadOpen}
        onToggleUpload={() => setIsUploadOpen(!isUploadOpen)}
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-16">
        {/* Upload Drawer / Dropzone */}
        <UploadDropzone
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
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
