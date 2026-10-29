"use client";

import { useEffect, useState } from "react";

interface QuickScrollButtonsProps {
  threshold?: number;
  className?: string;
}

export default function QuickScrollButtons({
  threshold = 300,
  className = "",
}: QuickScrollButtonsProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <aside
      aria-label="Điều hướng nhanh"
      className={`fixed bottom-6 right-6 z-40 flex flex-col gap-2.5 items-end ${className}`}
    >
      {/* Nút cuộn lên đầu trang */}
      {showScrollTop && (
        <div className="relative group animate-fadeIn">
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Lên đầu trang"
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-700/80 shadow-lg shadow-zinc-950/5 dark:shadow-black/25 hover:shadow-xl text-zinc-700 dark:text-zinc-200 hover:text-purple-600 dark:hover:text-purple-400 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <svg
              className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          </button>

          {/* Tooltip trên desktop */}
          <div className="hidden sm:block absolute right-full top-1/2 -translate-y-1/2 mr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-200">
            <div className="bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl border border-zinc-800 dark:border-zinc-700">
              Lên đầu trang
            </div>
          </div>
        </div>
      )}

      {/* Nút cuộn xuống cuối trang */}
      <div className="relative group">
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Xuống cuối trang"
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-700/80 shadow-lg shadow-zinc-950/5 dark:shadow-black/25 hover:shadow-xl text-zinc-700 dark:text-zinc-200 hover:text-purple-600 dark:hover:text-purple-400 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <svg
            className="w-5 h-5 transition-transform duration-200 group-hover:translate-y-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>

        {/* Tooltip trên desktop */}
        <div className="hidden sm:block absolute right-full top-1/2 -translate-y-1/2 mr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-200">
          <div className="bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl border border-zinc-800 dark:border-zinc-700">
            Xuống cuối trang
          </div>
        </div>
      </div>
    </aside>
  );
}

