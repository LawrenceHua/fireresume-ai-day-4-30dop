"use client";

import React, { useCallback, useState } from "react";
import { Upload, File, X, AlertCircle, CheckCircle } from "lucide-react";

interface FileUploadProps {
  label: string;
  accept?: string;
  maxSize?: number; // in MB
  onFileSelect: (file: File | null) => void;
  file: File | null;
  error?: string;
  helperText?: string;
}

export default function FileUpload({
  label,
  accept = ".pdf,.docx,.txt",
  maxSize = 5,
  onFileSelect,
  file,
  error,
  helperText,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      // Check file size
      const maxBytes = maxSize * 1024 * 1024;
      if (file.size > maxBytes) {
        setLocalError(`File too large. Maximum size is ${maxSize}MB`);
        return false;
      }

      // Check file type
      const validExtensions = accept.split(",").map((ext) => ext.trim().toLowerCase());
      const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;

      if (!validExtensions.includes(fileExtension)) {
        setLocalError(`Invalid file type. Accepted: ${accept}`);
        return false;
      }

      setLocalError(null);
      return true;
    },
    [accept, maxSize]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && validateFile(droppedFile)) {
        onFileSelect(droppedFile);
      }
    },
    [onFileSelect, validateFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile && validateFile(selectedFile)) {
        onFileSelect(selectedFile);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [onFileSelect, validateFile]
  );

  const handleRemove = useCallback(() => {
    onFileSelect(null);
    setLocalError(null);
  }, [onFileSelect]);

  const displayError = error || localError;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">{label}</label>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer
          ${isDragging ? "border-orange-500 bg-orange-500/10" : "border-slate-700 hover:border-slate-600"}
          ${displayError ? "border-red-500/50" : ""}
          ${file ? "border-green-500/50 bg-green-500/5" : ""}
        `}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {file ? (
          // File selected state
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <File className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white truncate max-w-[200px]">
                  {file.name}
                </p>
                <p className="text-xs text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                handleRemove();
              }}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          // Empty state
          <div className="text-center">
            <Upload className="w-8 h-8 mx-auto mb-3 text-slate-500" />
            <p className="text-sm text-slate-300 mb-1">
              Drag and drop or{" "}
              <span className="text-orange-400 font-medium">browse</span>
            </p>
            <p className="text-xs text-slate-500">
              {accept.replace(/\./g, "").toUpperCase()} • Max {maxSize}MB
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {displayError && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Helper text */}
      {helperText && !displayError && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}

      {/* Success indicator */}
      {file && !displayError && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>File ready for processing</span>
        </div>
      )}
    </div>
  );
}

