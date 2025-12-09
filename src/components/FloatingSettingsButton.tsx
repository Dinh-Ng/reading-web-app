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
      className="fixed bottom-6 right-6 z-30 group"
      aria-label="Mở cài đặt đọc truyện"
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity animate-pulse" />

        {/* Button */}
        <div className="relative w-14 h-14 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group-hover:scale-110">
          <svg
            className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300"
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

        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-zinc-900 dark:bg-zinc-800 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
            Cài đặt
            <div className="absolute top-full right-4 -mt-1">
              <div className="border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-800" />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
