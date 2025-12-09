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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Settings Popup */}
      <div className="fixed bottom-24 right-6 z-50 animate-slideUp">
        <div className="glass rounded-2xl shadow-xl p-6 w-80 border border-white/20">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
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
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              Cài đặt đọc truyện
            </h3>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              aria-label="Đóng"
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
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Cỡ chữ
              </label>
              <span className="text-sm font-semibold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-lg">
                {fontSize}px
              </span>
            </div>

            {/* Slider */}
            <div className="relative">
              <input
                type="range"
                min="14"
                max="24"
                step="1"
                value={fontSize}
                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${
                    ((fontSize - 14) / (24 - 14)) * 100
                  }%, rgb(228 228 231) ${
                    ((fontSize - 14) / (24 - 14)) * 100
                  }%, rgb(228 228 231) 100%)`,
                }}
              />
              <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                <span>Nhỏ</span>
                <span>Lớn</span>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                Xem trước:
              </p>
              <p
                className="text-zinc-800 dark:text-zinc-200 font-serif leading-relaxed"
                style={{ fontSize: `${fontSize}px` }}
              >
                Đây là đoạn văn mẫu để xem trước kích thước chữ.
              </p>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="w-full mt-4 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Đặt lại mặc định
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
          transition: all 0.2s;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.6);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
          transition: all 0.2s;
        }

        .slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.6);
        }
      `}</style>
    </>
  );
}
