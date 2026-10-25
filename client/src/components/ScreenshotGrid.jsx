import React from 'react';
import { ScreenshotCard } from './ScreenshotCard';
import { Camera, SearchX, UploadCloud, ChevronLeft, ChevronRight } from 'lucide-react';

export function ScreenshotGrid({
  screenshots,
  isLoading,
  searchQuery,
  onCardClick,
  onOpenUpload,
  onClearSearch,
  page,
  totalPages,
  onPageChange,
  total,
}) {
  // Skeleton loading placeholders
  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden animate-pulse flex flex-col"
            >
              <div className="aspect-[16/10] bg-slate-200 dark:bg-slate-800" />
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2" />
                </div>
                <div className="h-16 bg-slate-100 dark:bg-slate-800/40 rounded-xl" />
                <div className="flex gap-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state: No search results
  if (screenshots.length === 0 && searchQuery) {
    return (
      <div className="w-full max-w-md mx-auto my-16 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 mx-auto flex items-center justify-center mb-4">
          <SearchX className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          No matches found
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
          No screenshots contained &ldquo;{searchQuery}&rdquo;. Try another word, tag, or reset filters.
        </p>
        <button
          type="button"
          onClick={onClearSearch}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 transition-colors"
        >
          Clear search & filters
        </button>
      </div>
    );
  }

  // Empty state: Library completely empty
  if (screenshots.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto my-20 text-center px-4">
        <div className="w-20 h-20 rounded-3xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 mx-auto flex items-center justify-center mb-4 shadow-sm">
          <Camera className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          No screenshots yet
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6 max-w-xs mx-auto">
          Upload screenshots or run the folder watcher to automatically index and search text with Cloudinary OCR.
        </p>
        <button
          type="button"
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/30 transition-all hover:scale-[1.02]"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload your first screenshot</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Grid of Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {screenshots.map((item) => (
          <ScreenshotCard
            key={item._id || item.publicId}
            screenshot={item}
            searchQuery={searchQuery}
            onClick={onCardClick}
          />
        ))}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing Page <strong className="text-slate-800 dark:text-slate-200">{page}</strong> of{' '}
            <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({total} total items)
          </p>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-medium px-3 text-slate-700 dark:text-slate-300">
              {page} / {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
