import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Trash2,
  ExternalLink,
  Calendar,
  Sparkles,
  FileText,
  AlertTriangle,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import { getOptimizedModalUrl } from '../utils/cloudinary';

export function PreviewModal({
  screenshot,
  onClose,
  onDelete,
}) {
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!screenshot) return null;

  const handleCopyText = async () => {
    if (!screenshot.ocrText) return;
    try {
      await navigator.clipboard.writeText(screenshot.ocrText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = screenshot.url;
    link.target = '_blank';
    link.download = `ishot-${screenshot._id || 'screenshot'}.${screenshot.format || 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(screenshot._id || screenshot.publicId);
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      setIsDeleting(false);
    }
  };

  const formattedDate = screenshot.createdAt
    ? new Date(screenshot.createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const fullImageUrl = getOptimizedModalUrl(screenshot.url, 1800);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-screenshot-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col lg:flex-row overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-100/90 dark:bg-slate-800/90 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200 transition-colors shadow-md"
          aria-label="Close modal (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: High-res Image Preview */}
        <div className="lg:w-3/5 bg-slate-950 flex items-center justify-center p-4 sm:p-6 overflow-hidden relative min-h-[300px]">
          <img
            src={fullImageUrl}
            alt={screenshot.caption || 'Full screenshot preview'}
            className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
          />

          {/* Quick link to original Cloudinary media */}
          <a
            href={screenshot.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
            title="Open original Cloudinary URL in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Original</span>
          </a>
        </div>

        {/* Right Side: Metadata, Extracted OCR Text, and Actions */}
        <div className="lg:w-2/5 flex flex-col justify-between p-6 overflow-y-auto max-h-[85vh] bg-white dark:bg-slate-900 space-y-6">
          <div className="space-y-5">
            {/* Header: Category & Date */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                    {screenshot.category || 'Other'}
                  </span>
                  {screenshot.hasSensitiveData && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Sensitive Data</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mr-8">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formattedDate}</span>
                </div>
              </div>

              {/* AI Caption */}
              <h2
                id="modal-screenshot-title"
                className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-start gap-2"
              >
                <Sparkles className="w-4 h-4 text-brand-500 mt-1 flex-shrink-0" />
                <span>
                  {screenshot.caption || 'Screenshot Details & OCR Text'}
                </span>
              </h2>
            </div>

            {/* Sensitive Data Alert Banner */}
            {screenshot.hasSensitiveData && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Sensitive Information Detected</p>
                  <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                    This screenshot appears to contain sensitive data (such as OTPs, card numbers, passwords, PINs, or government IDs). Handle with care.
                  </p>
                </div>
              </div>
            )}

            {/* AI Tags */}
            {Array.isArray(screenshot.tags) && screenshot.tags.length > 0 && (
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                  <Tag className="w-3.5 h-3.5" />
                  <span>AI Tags (Gemini Flash)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {screenshot.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted OCR Text Box */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-500" />
                  <span>Extracted OCR Text</span>
                  {screenshot.ocrText && (
                    <span className="text-[11px] text-slate-400 font-normal">
                      ({screenshot.ocrText.length} characters)
                    </span>
                  )}
                </label>

                {screenshot.ocrText && (
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Copied!
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {screenshot.ocrText ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 max-h-56 overflow-y-auto">
                  <pre className="text-xs font-mono text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed select-text">
                    {screenshot.ocrText}
                  </pre>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-400 italic">
                  No text detected in this screenshot (or Cloudinary OCR add-on is disabled).
                </div>
              )}
            </div>

            {/* Technical Metadata */}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-800/50">
              <div>
                <span className="block text-[10px] text-slate-400">Dimensions</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {screenshot.width && screenshot.height
                    ? `${screenshot.width} × ${screenshot.height}`
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">Format & Size</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 uppercase">
                  {screenshot.format || 'IMG'} •{' '}
                  {screenshot.bytes
                    ? `${(screenshot.bytes / 1024).toFixed(1)} KB`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              {/* Copy text button */}
              <button
                type="button"
                onClick={handleCopyText}
                disabled={!screenshot.ocrText}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Full Text</span>
                  </>
                )}
              </button>

              {/* Download Image Button */}
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                title="Download original file"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>

              {/* Delete Button */}
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={`p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  confirmDelete
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
                title={confirmDelete ? 'Click again to confirm delete' : 'Delete screenshot'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {confirmDelete && (
              <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl animate-fadeIn">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Are you sure? This removes it from Cloudinary and DB.
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="font-semibold underline ml-2"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
