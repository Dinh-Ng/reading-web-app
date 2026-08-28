"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import type { Chapter, Story } from "@/types/story";
import ChapterContent from "@/components/ChapterContent";
import { saveReadingProgress, getReadingProgress } from "@/lib/reading-progress";

export default function ChapterPage() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [nextChapter, setNextChapter] = useState<Chapter | null>(null);
  const [prevChapter, setPrevChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (!db) {
          setLoading(false);
          return;
        }
        const storyRef = doc(db, "stories", id);
        const s = await getDoc(storyRef);
        if (s.exists()) setStory({ id: s.id, ...(s.data() as Omit<Story, "id">) });

        const chapRef = doc(storyRef, "chapters", chapterId);
        const c = await getDoc(chapRef);
        if (c.exists()) {
          const current = { id: c.id, ...(c.data() as Omit<Chapter, "id">) } as Chapter;
          setChapter(current);
          const idx = current.index ?? null;
          if (idx != null) {
            const chCol = collection(storyRef, "chapters");
            const prevSnap = await getDocs(query(chCol, where("index", "==", idx - 1)));
            const nextSnap = await getDocs(query(chCol, where("index", "==", idx + 1)));
            setPrevChapter(prevSnap.docs[0] ? ({ id: prevSnap.docs[0].id, ...(prevSnap.docs[0].data() as Omit<Chapter, "id">) } as Chapter) : null);
            setNextChapter(nextSnap.docs[0] ? ({ id: nextSnap.docs[0].id, ...(nextSnap.docs[0].data() as Omit<Chapter, "id">) } as Chapter) : null);
          } else {
            const chCol = collection(storyRef, "chapters");
            const ordered = await getDocs(query(chCol, orderBy("index", "asc")));
            const list = ordered.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Chapter, "id">) } as Chapter));
            const pos = list.findIndex((x) => x.id === chapterId);
            setPrevChapter(pos > 0 ? list[pos - 1] : null);
            setNextChapter(pos >= 0 && pos < list.length - 1 ? list[pos + 1] : null);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, chapterId]);

  // Save reading progress when chapter loads and on scroll
  useEffect(() => {
    if (!chapter || !story) return;

    // Get existing progress
    const savedProgress = getReadingProgress(id);
    const isReturningToSameChapter = savedProgress && savedProgress.chapterId === chapter.id;

    // Save initial progress
    const saveProgress = (scrollPos?: number) => {
      saveReadingProgress(id, {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterIndex: chapter.index,
        timestamp: Date.now(),
        scrollPosition: scrollPos ?? window.scrollY,
      });
    };

    // Only save position 0 if this is a NEW chapter (not returning to same one)
    if (!isReturningToSameChapter) {
      saveProgress(0);
    }

    // Save progress on scroll (debounced)
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        saveProgress();
      }, 1000); // Save 1 second after user stops scrolling
    };

    window.addEventListener('scroll', handleScroll);

    // Save progress before leaving page
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
      saveProgress();
    };
  }, [chapter, story, id]);

  // Restore scroll position AFTER content is loaded
  useEffect(() => {
    if (!chapter || loading) return; // Wait until loading is complete

    const savedProgress = getReadingProgress(id);
    const isReturningToSameChapter = savedProgress && savedProgress.chapterId === chapter.id;

    if (isReturningToSameChapter && savedProgress.scrollPosition) {
      // Content is loaded, now we can safely scroll
      const scrollToPosition = () => {
        window.scrollTo({
          top: savedProgress.scrollPosition!,
          behavior: 'smooth'
        });
        console.log('✅ Scrolled to position:', savedProgress.scrollPosition);
      };

      // Use requestAnimationFrame + timeout for reliability
      requestAnimationFrame(() => {
        setTimeout(scrollToPosition, 500); // Wait for render
      });
    }
  }, [chapter, loading, id]); // Triggers when chapter loads and loading becomes false

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-purple-50/20 to-pink-50/20 dark:from-zinc-950 dark:via-purple-950/10 dark:to-pink-950/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Đang tải chương…</p>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-purple-50/20 to-pink-50/20 dark:from-zinc-950 dark:via-purple-950/10 dark:to-pink-950/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Không tìm thấy chương</h2>
          <Link href={`/story/${id}`} className="text-purple-600 dark:text-purple-400 hover:underline">
            ← Quay lại trang truyện
          </Link>
        </div>
      </div>
    );
  }

  const [readingPercent, setReadingPercent] = useState(0);

  // Calculate scroll progress percentage
  useEffect(() => {
    const handleScrollProgress = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setReadingPercent(Math.min(100, Math.max(0, currentProgress)));
      }
    };

    window.addEventListener("scroll", handleScrollProgress, { passive: true });
    return () => window.removeEventListener("scroll", handleScrollProgress);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-purple-50/20 to-pink-50/20 dark:from-zinc-950 dark:via-purple-950/10 dark:to-pink-950/10">
      {/* Floating Navigation Bar */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg border-b border-zinc-200/60 dark:border-zinc-800/60 shadow-sm transition-colors">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link
            href={`/story/${id}`}
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group min-h-[40px] px-2 -mx-2 rounded-xl focus-visible:ring-2 focus-visible:ring-purple-500 min-w-0"
            aria-label={`Về trang truyện ${story?.title || ''}`}
          >
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="truncate max-w-[140px] sm:max-w-[260px] md:max-w-[360px]">{story?.title ?? "Truyện"}</span>
          </Link>

          <div className="flex items-center gap-2 flex-shrink-0">
            {prevChapter ? (
              <Link
                href={`/story/${id}/chapter/${prevChapter.id}`}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-purple-100 dark:hover:bg-purple-950/50 hover:text-purple-600 dark:hover:text-purple-400 transition-all min-h-[40px] active:scale-95"
                aria-label="Chương trước"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden xs:inline">Trước</span>
              </Link>
            ) : (
              <div
                aria-disabled="true"
                className="flex items-center gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-zinc-400 dark:text-zinc-600 opacity-40 cursor-not-allowed min-h-[40px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden xs:inline">Trước</span>
              </div>
            )}

            {nextChapter ? (
              <Link
                href={`/story/${id}/chapter/${nextChapter.id}`}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-purple-500/20 hover:shadow-lg transition-all hover:scale-105 active:scale-95 min-h-[40px]"
                aria-label="Chương sau"
              >
                <span className="hidden xs:inline">Sau</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <div
                aria-disabled="true"
                className="flex items-center gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-zinc-400 dark:text-zinc-600 opacity-40 cursor-not-allowed min-h-[40px]"
              >
                <span className="hidden xs:inline">Sau</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Scroll Progress Bar */}
        <div className="h-0.5 w-full bg-zinc-200/50 dark:bg-zinc-800/50">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-150 ease-out"
            style={{ width: `${readingPercent}%` }}
          />
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Chapter Header */}
        <div className="mb-8 sm:mb-12 text-center animate-slideDown">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs sm:text-sm font-bold mb-3 border border-purple-200/50 dark:border-purple-800/50">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {chapter.index != null ? `Chương ${chapter.index}` : "Chương truyện"}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">
            {chapter.title}
          </h1>
          {story && (
            <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {story.title}
            </p>
          )}
        </div>

        {/* Reading Content */}
        <article className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm hover:shadow-md transition-shadow p-5 sm:p-8 md:p-12 mb-8 sm:mb-12 border border-zinc-200/80 dark:border-zinc-800/80 animate-slideUp">
          <ChapterContent content={chapter.content} />
        </article>

        {/* Bottom Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-slideUp" style={{ animationDelay: "0.1s" }}>
          {prevChapter ? (
            <Link
              href={`/story/${id}/chapter/${prevChapter.id}`}
              className="group flex items-center gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-purple-300 dark:hover:border-purple-700 transition-all shadow-sm hover:shadow-md active:scale-[0.99]"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white text-purple-600 dark:text-purple-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[11px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase mb-0.5">Chương trước</div>
                <div className="text-sm font-bold text-zinc-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {prevChapter.title}
                </div>
              </div>
            </Link>
          ) : (
            <div className="hidden sm:block p-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 text-center text-xs text-zinc-400 dark:text-zinc-600 py-6">
              Đây là chương đầu tiên
            </div>
          )}

          {nextChapter ? (
            <Link
              href={`/story/${id}/chapter/${nextChapter.id}`}
              className="group flex items-center gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white transition-all shadow-md shadow-purple-500/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.99]"
            >
              <div className="flex-1 min-w-0 text-left sm:text-right">
                <div className="text-[11px] font-semibold tracking-wider text-white/80 uppercase mb-0.5">Chương sau</div>
                <div className="text-sm font-bold truncate">
                  {nextChapter.title}
                </div>
              </div>
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ) : (
            <div className="hidden sm:block p-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 text-center text-xs text-zinc-400 dark:text-zinc-600 py-6">
              Đây là chương mới nhất
            </div>
          )}
        </div>

        {/* Back to Story Link */}
        <div className="mt-8 sm:mt-10 text-center">
          <Link
            href={`/story/${id}`}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors py-2 px-4 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Xem mục lục toàn bộ chương
          </Link>
        </div>
      </main>
    </div>
  );
}
