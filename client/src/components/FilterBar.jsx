import React, { useState } from 'react';
import { Filter, Calendar, Tag, X, Check } from 'lucide-react';

const CATEGORIES = [
  { name: 'All', color: 'slate' },
  { name: 'Payments', color: 'emerald' },
  { name: 'Chats', color: 'sky' },
  { name: 'Study', color: 'purple' },
  { name: 'Code', color: 'amber' },
  { name: 'Tickets', color: 'rose' },
  { name: 'Other', color: 'zinc' },
];

export function FilterBar({
  selectedCategory,
  onSelectCategory,
  selectedTag,
  onSelectTag,
  dateFrom,
  dateTo,
  onChangeDateRange,
  onClearFilters,
  categoryCounts = {},
  availableTags = [],
  totalCount = 0,
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    Boolean(selectedTag) ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            const count =
              cat.name === 'All'
                ? totalCount
                : categoryCounts[cat.name] || 0;

            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => onSelectCategory(cat.name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                aria-pressed={isSelected}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isSelected
                      ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Controls: Tag & Date Pickers & Reset */}
        <div className="flex items-center gap-2">
          {/* Tag Filter Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTagMenu(!showTagMenu)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selectedTag
                  ? 'bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
              aria-label="Filter by tag"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{selectedTag ? `Tag: #${selectedTag}` : 'Tags'}</span>
            </button>

            {/* Tag Dropdown Menu */}
            {showTagMenu && (
              <div className="absolute right-0 mt-2 w-56 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Popular AI Tags
                </div>
                {availableTags.length === 0 ? (
                  <div className="text-xs text-slate-400 px-2 py-2">No tags available</div>
                ) : (
                  availableTags.map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => {
                        onSelectTag(selectedTag === item.tag ? '' : item.tag);
                        setShowTagMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        selectedTag === item.tag
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200 font-medium'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">#{item.tag}</span>
                      <span className="text-[10px] text-slate-400">{item.count}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Date Filter Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                dateFrom || dateTo
                  ? 'bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
              aria-label="Filter by date range"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{dateFrom || dateTo ? 'Date Active' : 'Date'}</span>
            </button>

            {/* Date Picker Popover */}
            {showDatePicker && (
              <div className="absolute right-0 mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 w-64 space-y-3">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Filter by Date Range
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                    From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => onChangeDateRange(e.target.value, dateTo)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                    To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => onChangeDateRange(dateFrom, e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onChangeDateRange('', '');
                      setShowDatePicker(false);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-2"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(false)}
                    className="text-xs px-2.5 py-1 rounded bg-brand-600 text-white hover:bg-brand-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              aria-label="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
