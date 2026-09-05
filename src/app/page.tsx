"use client";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, getDocs, serverTimestamp, getCountFromServer } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import type { Story } from "@/types/story";
import { getAllReadingProgress } from "@/lib/reading-progress";
import type { ReadingProgress } from "@/types/reading-progress";
import {
  getCachedStories,
  setCachedStories,
  saveHomeScrollPosition,
  getHomeScrollPosition,
} from "@/lib/stories-cache";

export default function Home() {
  const [stories, setStories] = useState<Story[]>(() => getCachedStories()?.stories ?? []);
  const [loading, setLoading] = useState(() => !getCachedStories());
  const [userId, setUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chapterCounts, setChapterCounts] = useState<Map<string, number>>(
    () => getCachedStories()?.chapterCounts ?? new Map()
  );
  const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>({});
  const [sortBy, setSortBy] = useState<"default" | "lastRead">("default");
  const [searchQuery, setSearchQuery] = useState("");

  // Form fields
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newAuthorLink, setNewAuthorLink] = useState("");
  const [newSource, setNewSource] = useState("");

  useEffect(() => {
    const cached = getCachedStories();
    if (cached) {
      setStories(cached.stories);
      setChapterCounts(cached.chapterCounts);
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        if (!db) { setLoading(false); return; }
        const snap = await getDocs(collection(db, "stories"));
        const items: Story[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Story, "id">) }));
        setStories(items);

        if (db) {
          const firestore = db;
          const counts = new Map<string, number>();
          await Promise.all(
            items.map(async (story) => {
              try {
                const chaptersRef = collection(firestore, "stories", story.id, "chapters");
                const countSnapshot = await getCountFromServer(chaptersRef);
                counts.set(story.id, countSnapshot.data().count);
              } catch {
                counts.set(story.id, 0);
              }
            })
          );
          setChapterCounts(counts);
          setCachedStories(items, counts);
        }
      } catch (err) {
        console.error("Error fetching stories:", err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => saveHomeScrollPosition(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Restore scroll position
  useEffect(() => {
    if (!loading && stories.length > 0) {
      const savedScroll = getHomeScrollPosition();
      if (savedScroll > 0) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: savedScroll, behavior: "instant" as ScrollBehavior });
        });
      }
    }
  }, [loading, stories.length]);

  useEffect(() => {
    setReadingProgress(getAllReadingProgress());
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null));
    return () => unsub();
  }, []);

  const createStory = async () => {
    if (!userId || !db) return;
    const title = newTitle.trim();
    if (!title) return;

    const storyData: Partial<Story> = { title, createdBy: userId, createdAt: serverTimestamp() };
    if (newAuthor.trim()) storyData.author = newAuthor.trim();
    if (newAuthorLink.trim()) storyData.authorLink = newAuthorLink.trim();
    if (newSource.trim()) storyData.source = newSource.trim();

    await addDoc(collection(db, "stories"), storyData);

    setNewTitle(""); setNewAuthor(""); setNewAuthorLink(""); setNewSource("");
    setIsModalOpen(false);

    const snap = await getDocs(collection(db, "stories"));
    const items: Story[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Story, "id">) }));
    setStories(items);
    setCachedStories(items, chapterCounts);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewTitle(""); setNewAuthor(""); setNewAuthorLink(""); setNewSource("");
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return "Vừa xong";
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} ngày trước`;
    return "Lâu rồi";
  };

  const filteredAndSorted = useMemo(() => {
    let list = [...stories];
    // Search filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.author?.toLowerCase().includes(q)
      );
    }
    // Sort
    if (sortBy === "lastRead") {
      list.sort((a, b) => (readingProgress[b.id]?.timestamp || 0) - (readingProgress[a.id]?.timestamp || 0));
    }
    return list;
  }, [stories, searchQuery, sortBy, readingProgress]);

  useEffect(() => {
    const handleOpen = () => setIsModalOpen(true);
    window.addEventListener("open-add-story", handleOpen);

    const params = new URLSearchParams(window.location.search);
    if (params.get("openAddStory") === "true") {
      setIsModalOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }

    return () => window.removeEventListener("open-add-story", handleOpen);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-purple-50/20 to-pink-50/20 dark:from-zinc-950 dark:via-purple-950/15 dark:to-pink-950/15">

      {/* ─── Hero Section ───────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 py-8 sm:py-12 md:py-16 px-4 sm:px-6">
        {/* Dot pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6TTI0IDM0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6bTAtMTBjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00ek0xMiAzNGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6bTAtMTBjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />

        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-3 tracking-tight animate-slideDown leading-tight">
            Khám phá thế giới truyện chữ
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-white/85 mb-5 sm:mb-7 max-w-xl mx-auto animate-slideUp">
            Đọc và chia sẻ những câu chuyện hấp dẫn
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto animate-scaleIn">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="hero-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên truyện hoặc tác giả…"
              className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 rounded-2xl bg-white/95 dark:bg-zinc-900/90 backdrop-blur-sm text-sm sm:text-base text-zinc-900 dark:text-white placeholder-zinc-400 border border-white/50 shadow-xl shadow-black/10 focus:outline-none focus:ring-2 focus:ring-white/60 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-3 flex items-center px-1 text-zinc-400 hover:text-zinc-600"
                aria-label="Xóa tìm kiếm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─── Main Content ────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
            <div className="w-12 h-12 border-4 border-purple-200 dark:border-purple-900/50 border-t-purple-600 rounded-full animate-spin mb-4" />
            <p className="text-sm sm:text-base font-medium text-zinc-600 dark:text-zinc-400">Đang tải danh sách truyện…</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-16 sm:py-20 bg-white/50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 p-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center shadow-inner">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Chưa có truyện nào</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              {userId ? 'Nhấn "+ Thêm truyện" trên thanh điều hướng để bắt đầu.' : "Đăng nhập để đăng và quản lý truyện của bạn."}
            </p>
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            {/* ── Filter/Control Bar ─────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Count + search result indicator */}
              <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {searchQuery
                  ? `${filteredAndSorted.length} / ${stories.length} truyện khớp với "${searchQuery}"`
                  : `Hiển thị ${stories.length} truyện`}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Mobile search (below hero on small screens for quick re-filter) */}
                <div className="relative flex-1 sm:hidden min-w-0">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm truyện…"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>

                {/* Sort tabs */}
                <div className="flex items-center p-1 bg-zinc-200/60 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700 flex-shrink-0">
                  {(["default", "lastRead"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setSortBy(tab)}
                      className={`min-h-[36px] px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                        sortBy === tab
                          ? "bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      }`}
                    >
                      {tab === "default" ? "Tất cả" : "Mới đọc"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── No search results ──────────────────────────── */}
            {filteredAndSorted.length === 0 && searchQuery ? (
              <div className="text-center py-12 bg-white/50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60">
                <svg className="w-10 h-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Không tìm thấy truyện nào cho &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-xs text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Xóa tìm kiếm
                </button>
              </div>
            ) : (
              /* ── Stories Grid ───────────────────────────────── */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                {filteredAndSorted.map((s, index) => (
                  <Link
                    key={s.id}
                    href={`/story/${s.id}`}
                    className="group relative flex flex-col justify-between bg-white dark:bg-zinc-900 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 hover:border-purple-300 dark:hover:border-purple-700/60 hover:-translate-y-1 active:scale-[0.99] animate-slideUp"
                    style={{ animationDelay: `${index * 0.04}s` }}
                  >
                    {/* Top gradient bar */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 opacity-60 group-hover:opacity-100 transition-opacity" />

                    <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Reading badge */}
                        {readingProgress[s.id] && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200/50 dark:border-purple-800/50 text-[11px] font-semibold text-purple-600 dark:text-purple-400 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                            Đang đọc
                          </div>
                        )}

                        {/* Title */}
                        <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-snug">
                          {s.title}
                        </h3>

                        {/* Meta info */}
                        <div className="space-y-1.5 mb-4">
                          {s.author && (
                            <div className="flex items-center gap-2">
                              {/* User icon */}
                              <svg className="w-3.5 h-3.5 flex-shrink-0 text-purple-400 dark:text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">{s.author}</span>
                            </div>
                          )}

                          {/* Chapter count */}
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 flex-shrink-0 text-pink-400 dark:text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400">
                              {chapterCounts.get(s.id) !== undefined
                                ? chapterCounts.get(s.id) === 0
                                  ? "Chưa có chương"
                                  : `${chapterCounts.get(s.id)} chương`
                                : "Đang tải..."}
                            </span>
                          </div>

                          {/* Last read */}
                          {readingProgress[s.id] && (
                            <div className="flex items-center gap-2">
                              <svg className="w-3.5 h-3.5 flex-shrink-0 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400">
                                Đọc {formatTimeAgo(readingProgress[s.id].timestamp)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400 group-hover:underline">
                          {readingProgress[s.id] ? "Tiếp tục đọc" : "Xem chi tiết"}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                          <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── Add Story Modal ──────────────────────────────────── */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Thêm truyện mới"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4 overflow-y-auto"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-2xl animate-scaleIn border border-zinc-200/80 dark:border-zinc-800/80"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Đóng"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3 shadow-md shadow-purple-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Thêm truyện mới</h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">Điền thông tin truyện bạn muốn thêm</p>
            </div>

            <div className="space-y-4 sm:space-y-5">
              {[
                { label: "Tiêu đề", required: true, value: newTitle, setter: setNewTitle, placeholder: "Nhập tiêu đề truyện", type: "text" },
                { label: "Tác giả", required: false, value: newAuthor, setter: setNewAuthor, placeholder: "Nhập tên tác giả", type: "text" },
                { label: "Link tác giả", required: false, value: newAuthorLink, setter: setNewAuthorLink, placeholder: "https://...", type: "url" },
                { label: "Nguồn", required: false, value: newSource, setter: setNewSource, placeholder: "Ví dụ: Sưu tầm, Tàng Thư Viện", type: "text" },
              ].map(({ label, required, value, setter, placeholder, type }) => (
                <div key={label}>
                  <label className="block text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {label} {required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 sm:py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 sm:mt-8 flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 min-h-[44px] rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-[0.98]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={createStory}
                disabled={!newTitle.trim()}
                className="flex-1 min-h-[44px] rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-500/20 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 disabled:hover:scale-100"
              >
                Thêm truyện
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
