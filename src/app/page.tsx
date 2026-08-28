"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, getDocs, serverTimestamp, getCountFromServer } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import type { Story } from "@/types/story";
import { getAllReadingProgress } from "@/lib/reading-progress";
import type { ReadingProgress } from "@/types/reading-progress";

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chapterCounts, setChapterCounts] = useState<Map<string, number>>(new Map());
  const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>({});
  const [sortBy, setSortBy] = useState<'default' | 'lastRead'>('default');

  // Form fields
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newAuthorLink, setNewAuthorLink] = useState("");
  const [newSource, setNewSource] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        if (!db) {
          setLoading(false);
          return;
        }
        const snap = await getDocs(collection(db, "stories"));
        const items: Story[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Story, "id">) }));
        setStories(items);

        // Fetch chapter counts for each story
        if (db) {
          const firestore = db; // Create local constant for type safety
          const counts = new Map<string, number>();
          await Promise.all(
            items.map(async (story) => {
              try {
                const chaptersRef = collection(firestore, "stories", story.id, "chapters");
                const countSnapshot = await getCountFromServer(chaptersRef);
                counts.set(story.id, countSnapshot.data().count);
              } catch (error) {
                counts.set(story.id, 0);
              }
            })
          );
          setChapterCounts(counts);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    // Load reading progress
    setReadingProgress(getAllReadingProgress());

    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null));
    return () => unsub();
  }, []);

  const createStory = async () => {
    if (!userId || !db) return;
    const title = newTitle.trim();
    if (!title) return;

    const storyData: Partial<Story> = {
      title,
      createdBy: userId,
      createdAt: serverTimestamp(),
    };

    if (newAuthor.trim()) storyData.author = newAuthor.trim();
    if (newAuthorLink.trim()) storyData.authorLink = newAuthorLink.trim();
    if (newSource.trim()) storyData.source = newSource.trim();

    await addDoc(collection(db, "stories"), storyData);

    // Reset form
    setNewTitle("");
    setNewAuthor("");
    setNewAuthorLink("");
    setNewSource("");
    setIsModalOpen(false);

    // Refresh stories list
    const snap = await getDocs(collection(db, "stories"));
    const items: Story[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Story, "id">) }));
    setStories(items);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewTitle("");
    setNewAuthor("");
    setNewAuthorLink("");
    setNewSource("");
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);

    if (diffInSeconds < 60) return "Vừa xong";

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} ngày trước`;

    return "Lâu rồi";
  };

  const sortedStories = [...stories].sort((a, b) => {
    if (sortBy === 'lastRead') {
      const timeA = readingProgress[a.id]?.timestamp || 0;
      const timeB = readingProgress[b.id]?.timestamp || 0;
      return timeB - timeA;
    }
    return 0; // Default order
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-purple-50/20 to-pink-50/20 dark:from-zinc-950 dark:via-purple-950/15 dark:to-pink-950/15">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 py-14 sm:py-16 px-4 sm:px-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6TTI0IDM0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6bTAtMTBjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00ek0xMiAzNGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6bTAtMTBjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="relative mx-auto max-w-6xl text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4 tracking-tight animate-slideDown">
            Khám phá thế giới truyện chữ
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto animate-slideUp">
            Đọc và chia sẻ những câu chuyện hấp dẫn với trải nghiệm đọc mượt mà
          </p>
          {userId && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl bg-white text-purple-700 font-semibold shadow-xl shadow-purple-900/20 hover:shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 animate-scaleIn focus-visible:ring-4 focus-visible:ring-white/50"
            >
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Thêm truyện mới
            </button>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
            <div className="w-12 h-12 border-4 border-purple-200 dark:border-purple-900/50 border-t-purple-600 rounded-full animate-spin mb-4"></div>
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
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
              {userId ? "Hãy thêm truyện đầu tiên của bạn bằng nút phía trên!" : "Đăng nhập để bắt đầu đăng và quản lý truyện của bạn."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filter Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Hiển thị {sortedStories.length} truyện
              </span>
              <div className="flex items-center p-1 bg-zinc-200/60 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setSortBy('default')}
                  className={`min-h-[38px] px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    sortBy === 'default'
                      ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('lastRead')}
                  className={`min-h-[38px] px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    sortBy === 'lastRead'
                      ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Mới đọc gần đây
                </button>
              </div>
            </div>

            {/* Stories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {sortedStories.map((s, index) => (
                <Link
                  key={s.id}
                  href={`/story/${s.id}`}
                  className="group relative flex flex-col justify-between bg-white dark:bg-zinc-900 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 hover:border-purple-300 dark:hover:border-purple-700/60 hover:-translate-y-1 active:scale-[0.99] animate-slideUp"
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  {/* Subtle top indicator gradient */}
                  <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 opacity-60 group-hover:opacity-100 transition-opacity" />

                  {/* Content */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Recently read badge */}
                      {readingProgress[s.id] && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200/50 dark:border-purple-800/50 text-[11px] font-semibold text-purple-600 dark:text-purple-400 mb-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                          Đang đọc
                        </div>
                      )}

                      <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-3 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-snug">
                        {s.title}
                      </h3>

                      <div className="space-y-2 mb-4 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                        {s.author && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 flex-shrink-0 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="truncate font-medium">{s.author}</span>
                          </div>
                        )}

                        {/* Chapter count */}
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 flex-shrink-0 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <span>
                            {chapterCounts.get(s.id) !== undefined
                              ? chapterCounts.get(s.id) === 0
                                ? "Chưa có chương"
                                : `${chapterCounts.get(s.id)} chương`
                              : "Đang tải..."}
                          </span>
                        </div>

                        {/* Last Read Timestamp */}
                        {readingProgress[s.id] && (
                          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Đọc {formatTimeAgo(readingProgress[s.id].timestamp)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-purple-600 dark:text-purple-400 font-semibold group-hover:underline">
                        {readingProgress[s.id] ? "Tiếp tục đọc" : "Xem chi tiết"}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <svg className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal Add Story */}
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
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Đóng"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal header */}
            <div className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3 shadow-md shadow-purple-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                Thêm truyện mới
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Điền thông tin truyện bạn muốn thêm
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Nhập tiêu đề truyện"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 sm:py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Tác giả
                </label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="Nhập tên tác giả"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 sm:py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Link tác giả
                </label>
                <input
                  type="url"
                  value={newAuthorLink}
                  onChange={(e) => setNewAuthorLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 sm:py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Nguồn
                </label>
                <input
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  placeholder="Nhập nguồn truyện (ví dụ: Sưu tầm, Tàng Thư Viện)"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 sm:py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 sm:mt-8 flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 min-h-[44px] rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-98"
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
