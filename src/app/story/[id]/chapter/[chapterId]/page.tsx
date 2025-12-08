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

    // Restore scroll position if returning to same chapter
    if (isReturningToSameChapter && savedProgress.scrollPosition) {
      // Delay scroll restoration to ensure content is rendered
      setTimeout(() => {
        window.scrollTo({
          top: savedProgress.scrollPosition,
          behavior: 'smooth'
        });
      }, 100);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-purple-50/20 to-pink-50/20 dark:from-zinc-950 dark:via-purple-950/10 dark:to-pink-950/10">
      {/* Floating Navigation Bar */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg border-b border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link
            href={`/story/${id}`}
            className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group"
          >
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">{story?.title ?? "Truyện"}</span>
            <span className="sm:hidden">Quay lại</span>
          </Link>
          <div className="flex gap-2">
            {prevChapter ? (
              <Link
                href={`/story/${id}/chapter/${prevChapter.id}`}
                className="flex items-center gap-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Trước</span>
              </Link>
            ) : (
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 dark:text-zinc-600 opacity-50 cursor-not-allowed">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
            )}
            {nextChapter ? (
              <Link
                href={`/story/${id}/chapter/${nextChapter.id}`}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white hover:shadow-lg transition-all hover:scale-105"
              >
                <span className="hidden sm:inline">Sau</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 dark:text-zinc-600 opacity-50 cursor-not-allowed">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Chapter Header */}
        <div className="mb-12 text-center animate-slideDown">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 text-sm font-semibold mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {chapter.index != null ? `Chương ${chapter.index}` : "Chương"}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2">
            {chapter.title}
          </h1>
          {story && (
            <p className="text-zinc-600 dark:text-zinc-400">
              {story.title}
            </p>
          )}
        </div>

        {/* Reading Content */}
        <article className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-8 md:p-12 mb-12 border border-zinc-200 dark:border-zinc-800 animate-slideUp">
          <ChapterContent content={chapter.content} />
        </article>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between gap-4 animate-slideUp" style={{ animationDelay: "0.1s" }}>
          {prevChapter ? (
            <Link
              href={`/story/${id}/chapter/${prevChapter.id}`}
              className="group flex-1 flex items-center gap-3 p-5 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all shadow-md hover:shadow-lg"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Chương trước</div>
                <div className="font-semibold text-zinc-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {prevChapter.title}
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex-1"></div>
          )}

          {nextChapter ? (
            <Link
              href={`/story/${id}/chapter/${nextChapter.id}`}
              className="group flex-1 flex items-center gap-3 p-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <div className="flex-1 min-w-0 text-right">
                <div className="text-xs text-white/80 mb-1">Chương sau</div>
                <div className="font-semibold truncate">
                  {nextChapter.title}
                </div>
              </div>
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ) : (
            <div className="flex-1"></div>
          )}
        </div>

        {/* Back to Story Link */}
        <div className="mt-8 text-center">
          <Link
            href={`/story/${id}`}
            className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Xem tất cả chương
          </Link>
        </div>
      </main>
    </div>
  );
}
