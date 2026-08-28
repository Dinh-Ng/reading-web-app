"use client";
import React from "react";

interface FloatingSettingsButtonProps {
  onClick: () => void;
}

export default function FloatingSettingsButton({
  onClick,
}: FloatingSettingsButtonProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-30 group rounded-full focus-visible:ring-4 focus-visible:ring-purple-500/50 outline-none"
      aria-label="Mở cài đặt đọc truyện (cỡ chữ, giao diện)"
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full blur-md opacity-40 group-hover:opacity-75 transition-opacity" />

        {/* Button */}
        <div className="relative w-13 h-13 sm:w-14 sm:h-14 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 transition-all duration-200 flex items-center justify-center group-hover:scale-105 active:scale-95">
          <svg
            className="w-6 h-6 text-white group-hover:rotate-45 transition-transform duration-300"
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
        </div>

        {/* Desktop Tooltip */}
        <div className="hidden sm:block absolute bottom-full right-0 mb-2.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 pointer-events-none duration-200">
          <div className="bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl border border-zinc-800 dark:border-zinc-700">
            Cài đặt đọc
            <div className="absolute top-full right-5 -mt-1">
              <div className="border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-800" />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
