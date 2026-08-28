"use client";
import React from "react";

interface ReadingSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

export default function ReadingSettings({
  isOpen,
  onClose,
  fontSize,
  onFontSizeChange,
}: ReadingSettingsProps) {
  const handleReset = () => {
    onFontSizeChange(18); // Default font size
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Settings Popup */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cài đặt giao diện đọc truyện"
        className="fixed bottom-20 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-24 z-50 animate-slideUp max-w-sm sm:w-84 ml-auto"
      >
        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-5 sm:p-6 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-900 dark:text-zinc-100">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </span>
              Cài đặt đọc truyện
            </h3>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500"
              aria-label="Đóng bảng cài đặt"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Font Size Control */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="font-size-slider" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Kích thước chữ
              </label>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-3 py-1 rounded-xl border border-purple-200/50 dark:border-purple-800/50">
                {fontSize}px
              </span>
            </div>

            {/* Quick Size Preset Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[15, 18, 20, 22].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onFontSizeChange(size)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all min-h-[38px] ${
                    fontSize === size
                      ? "bg-purple-600 text-white shadow-md shadow-purple-500/25 scale-100"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>

            {/* Slider */}
            <div className="pt-2">
              <input
                id="font-size-slider"
                type="range"
                min="14"
                max="26"
                step="1"
                value={fontSize}
                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                className="reading-slider bg-zinc-200 dark:bg-zinc-700 cursor-pointer"
                aria-valuemin={14}
                aria-valuemax={26}
                aria-valuenow={fontSize}
                aria-label="Thanh trượt kích thước chữ"
              />
              <div className="flex justify-between text-xs font-medium text-zinc-400 dark:text-zinc-500 mt-2 px-1">
                <span>Nhỏ (14px)</span>
                <span>Chuẩn (18px)</span>
                <span>Lớn (26px)</span>
              </div>
            </div>

            {/* Preview Box */}
            <div className="mt-4 p-3.5 sm:p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
              <p className="text-[11px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase mb-1.5">
                Xem trước:
              </p>
              <p
                className="reading-content text-zinc-800 dark:text-zinc-200 leading-relaxed line-clamp-3"
                style={{ fontSize: `${fontSize}px` }}
              >
                Đêm trăng sáng tỏ, gió thổi nhè nhẹ qua từng tán lá. Đây là đoạn văn mẫu hiển thị kích thước văn bản thực tế.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs sm:text-sm transition-all active:scale-98"
              >
                Đặt lại mặc định (18px)
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
