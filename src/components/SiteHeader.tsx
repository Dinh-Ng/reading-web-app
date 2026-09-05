"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import HeaderRight from "@/components/AuthButton";

interface SiteHeaderProps {
  onOpenAddStory?: () => void;
}

export default function SiteHeader({ onOpenAddStory }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Hide the global site header on chapter reading pages so it doesn't clash with the reader toolbar
  if (pathname?.includes("/chapter/")) {
    return null;
  }

  const handleOpenAddStory = () => {
    if (onOpenAddStory) {
      onOpenAddStory();
    } else if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("open-add-story"));
    } else {
      router.push("/?openAddStory=true");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md transition-colors">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 group focus-visible:ring-2 focus-visible:ring-purple-500 rounded-xl p-1 -m-1 transition-transform active:scale-95"
          aria-label="Truyện Chữ - Về trang chủ"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
            Truyện Chữ
          </span>
        </Link>

        {/* Right side: Add button + Auth */}
        <HeaderRight onOpenAddStory={handleOpenAddStory} />
      </div>
    </header>
  );
}
