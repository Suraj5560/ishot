import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, X, FileImage, Loader2 } from 'lucide-react';
import { uploadScreenshotApi } from '../services/api';

export function UploadDropzone({ onUploadSuccess, onClose, isOpen }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files) => {
    const validImageFiles = files.filter((file) =>
      ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'].includes(
        file.type
      )
    );

    if (validImageFiles.length === 0) {
      return;
    }

    // Add each file to the upload queue with initial state
    const newItems = validImageFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      progress: 0,
      status: 'uploading', // 'uploading' | 'success' | 'duplicate' | 'error'
      error: null,
      result: null,
    }));

    setUploadQueue((prev) => [...newItems, ...prev]);

    // Process each file concurrently
    newItems.forEach((item) => {
      uploadFile(item);
    });
  };

  const uploadFile = async (item) => {
    try {
      const response = await uploadScreenshotApi(item.file, (percent) => {
        setUploadQueue((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, progress: percent } : it
          )
        );
      });

      setUploadQueue((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                progress: 100,
                status: response.duplicate ? 'duplicate' : 'success',
                result: response.screenshot,
              }
            : it
        )
      );

      // Notify parent to refresh list/stats
      if (onUploadSuccess) {
        onUploadSuccess(response);
      }
    } catch (err) {
      setUploadQueue((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, status: 'error', error: err.message || 'Upload failed' }
            : it
        )
      );
    }
  };

  const clearCompleted = () => {
    setUploadQueue((prev) =>
      prev.filter((it) => it.status === 'uploading')
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-brand-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Upload Screenshots for Instant OCR & AI Tagging
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            {uploadQueue.length > 0 && (
              <button
                type="button"
                onClick={clearCompleted}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Clear Queue
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close upload panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 scale-[1.005]'
              : 'border-slate-300 dark:border-slate-700 hover:border-brand-400 bg-slate-50/50 dark:bg-slate-800/30'
          }`}
          role="button"
          tabIndex={0}
          aria-label="Drop screenshot files or click to browse"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300 flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="text-brand-600 dark:text-brand-400 font-semibold underline underline-offset-2">
                Click to browse
              </span>{' '}
              or drag & drop your screenshots here
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Supports PNG, JPG, WEBP, GIF up to 20MB (multiple files allowed)
            </p>
          </div>
        </div>

        {/* Upload Progress List */}
        {uploadQueue.length > 0 && (
          <div className="mt-4 space-y-2 max-h-52 overflow-y-auto pr-1">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs"
              >
                <div className="flex items-center space-x-3 truncate mr-3">
                  <FileImage className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="truncate">
                    <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                      {item.name}
                    </p>
                    <span className="text-[11px] text-slate-400">{item.size}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  {item.status === 'uploading' && (
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-brand-500 h-full transition-all duration-200"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {item.progress}%
                      </span>
                      <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin" />
                    </div>
                  )}

                  {item.status === 'success' && (
                    <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Extracted & Saved</span>
                    </div>
                  )}

                  {item.status === 'duplicate' && (
                    <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Duplicate Skipped</span>
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div className="flex items-center space-x-1 text-rose-600 dark:text-rose-400 font-medium">
                      <AlertCircle className="w-4 h-4" />
                      <span className="truncate max-w-[140px]">{item.error}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
