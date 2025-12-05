"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { Story } from "@/types/story";

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form fields
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newAuthorLink, setNewAuthorLink] = useState("");
  const [newSource, setNewSource] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const snap = await getDocs(collection(db, "stories"));
        const items: Story[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Story, "id">) }));
        setStories(items);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null));
    return () => unsub();
  }, []);

  const createStory = async () => {
    if (!userId) return;
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
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Truyện chữ</h1>

        {userId && (
          <div className="mt-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Thêm truyện mới
            </button>
          </div>
        )}

        {loading ? (
          <p className="mt-6 text-zinc-600 dark:text-zinc-400">Đang tải danh sách truyện…</p>
        ) : (
          <ul className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
            {stories.map((s) => (
              <li key={s.id} className="py-3">
                <Link href={`/story/${s.id}`} className="text-lg font-medium text-blue-600 dark:text-blue-400">
                  {s.title}
                </Link>
              </li>
            ))}
            {stories.length === 0 && (
              <li className="py-3 text-zinc-600 dark:text-zinc-400">Chưa có truyện nào trong Firestore</li>
            )}
          </ul>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-md rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal header */}
            <h2 className="text-xl font-semibold text-black dark:text-white mb-6">
              Thêm truyện mới
            </h2>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Nhập tiêu đề truyện"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Tác giả
                </label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="Nhập tên tác giả"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Link tác giả
                </label>
                <input
                  type="url"
                  value={newAuthorLink}
                  onChange={(e) => setNewAuthorLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Nguồn
                </label>
                <input
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  placeholder="Nhập nguồn truyện"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={closeModal}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={createStory}
                disabled={!newTitle.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Thêm truyện
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
