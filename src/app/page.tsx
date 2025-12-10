"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, getDocs, serverTimestamp, getCountFromServer } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { Story } from "@/types/story";

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chapterCounts, setChapterCounts] = useState<Map<string, number>>(new Map());

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
          const counts = new Map<string, number>();
          await Promise.all(
            items.map(async (story) => {
              try {
                const chaptersRef = collection(db, "stories", story.id, "chapters");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-purple-50/30 to-pink-50/30 dark:from-zinc-950 dark:via-purple-950/20 dark:to-pink-950/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 py-16 px-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6TTI0IDM0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6bTAtMTBjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00ek0xMiAzNGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6bTAtMTBjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="relative mx-auto max-w-6xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 animate-slideDown">
            Khám phá thế giới truyện chữ
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-8 animate-slideUp">
            Đọc và chia sẻ những câu chuyện tuyệt vời
          </p>
          {userId && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-purple-600 font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 animate-scaleIn"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Thêm truyện mới
            </button>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
            <p className="text-zinc-600 dark:text-zinc-400">Đang tải danh sách truyện…</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
              <svg className="w-12 h-12 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-2">Chưa có truyện nào</h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              {userId ? "Hãy thêm truyện đầu tiên của bạn!" : "Đăng nhập để thêm truyện mới"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((s, index) => (
            <Link
              key={s.id}
              href={`/story/${s.id}`}
              className="group relative bg-white dark:bg-zinc-900 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-700 hover:-translate-y-1 animate-slideUp"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Content */}
              <div className="relative p-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-3 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {s.title}
                </h3>

                <div className="space-y-2 mb-4">
                  {s.author && (
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="truncate">{s.author}</span>
                    </div>
                  )}
                  {s.source && (
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span className="truncate">{s.source}</span>
                    </div>
                  )}

                  {/* Chapter count */}
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                </div>

                {/* Read button */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-600 dark:text-purple-400 font-medium group-hover:underline">
                      Đọc truyện
                    </span>
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-2xl animate-scaleIn border border-zinc-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal header */}
            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                Thêm truyện mới
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Điền thông tin truyện bạn muốn thêm
              </p>
            </div>

            {/* Form */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Nhập tiêu đề truyện"
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Tác giả
                </label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="Nhập tên tác giả"
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Link tác giả
                </label>
                <input
                  type="url"
                  value={newAuthorLink}
                  onChange={(e) => setNewAuthorLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Nguồn
                </label>
                <input
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  placeholder="Nhập nguồn truyện"
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 rounded-xl border-2 border-zinc-300 dark:border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={createStory}
                disabled={!newTitle.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 disabled:hover:scale-100"
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
