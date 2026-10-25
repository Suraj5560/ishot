import React, { useState } from 'react';
import { Tag, Calendar, Sparkles, FileText, ShieldAlert } from 'lucide-react';
import { getOptimizedThumbnailUrl } from '../utils/cloudinary';
import { HighlightedText } from '../utils/highlight';

const CATEGORY_STYLES = {
  Payments: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  Chats: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
  Study: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
  Code: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  Tickets: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  Other: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export function ScreenshotCard({ screenshot, searchQuery, onClick }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const thumbnailUrl = getOptimizedThumbnailUrl(screenshot.url, 400);

  const categoryStyle =
    CATEGORY_STYLES[screenshot.category] || CATEGORY_STYLES.Other;

  const formattedDate = screenshot.createdAt
    ? new Date(screenshot.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const displaySnippet = screenshot.snippet || screenshot.ocrText?.slice(0, 100) || '';

  return (
    <article
      onClick={() => onClick(screenshot)}
      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-brand-500/50 dark:hover:border-brand-400/50 transition-all duration-300 flex flex-col cursor-pointer transform hover:-translate-y-1 focus-within:ring-2 focus-within:ring-brand-500"
      tabIndex={0}
      role="button"
      aria-label={`Screenshot in ${screenshot.category}: ${screenshot.caption || 'Details'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(screenshot);
        }
      }}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse flex items-center justify-center">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
        )}

        <img
          src={thumbnailUrl}
          alt={screenshot.caption || 'Screenshot thumbnail'}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Category Badge overlay on top-left */}
        <div className="absolute top-2.5 left-2.5">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-md shadow-sm ${categoryStyle}`}
          >
            {screenshot.category || 'Other'}
          </span>
        </div>

        {/* Sensitive Data Badge overlay on top-right */}
        {screenshot.hasSensitiveData && (
          <div className="absolute top-2.5 right-2.5">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-600 text-white shadow-md border border-rose-400/30">
              <ShieldAlert className="w-3 h-3 text-white" />
              <span>Sensitive</span>
            </span>
          </div>
        )}

        {/* Dimensions or Format overlay */}
        {screenshot.width && screenshot.height && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/60 text-white backdrop-blur-sm">
            {screenshot.width}×{screenshot.height}
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="p-4 flex flex-col flex-1 justify-between space-y-3">
        {/* Caption */}
        {screenshot.caption ? (
          <div className="flex items-start gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
            <p className="line-clamp-2 leading-relaxed">{screenshot.caption}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No caption generated</p>
        )}

        {/* Matched Snippet / OCR Preview */}
        {displaySnippet ? (
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
            <HighlightedText text={displaySnippet} query={searchQuery} />
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">No text extracted</div>
        )}

        {/* Tags */}
        {Array.isArray(screenshot.tags) && screenshot.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center pt-1">
            <Tag className="w-3 h-3 text-slate-400" />
            {screenshot.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50"
              >
                #{tag}
              </span>
            ))}
            {screenshot.tags.length > 3 && (
              <span className="text-[10px] text-slate-400">
                +{screenshot.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer date */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formattedDate}</span>
          </div>
          <span className="group-hover:text-brand-500 transition-colors font-medium">
            View details &rarr;
          </span>
        </div>
      </div>
    </article>
  );
}
