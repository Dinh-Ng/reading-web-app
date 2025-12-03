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
  const [newTitle, setNewTitle] = useState("");

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
    await addDoc(collection(db, "stories"), {
      title,
      createdBy: userId,
      createdAt: serverTimestamp(),
    });
    setNewTitle("");
    const snap = await getDocs(collection(db, "stories"));
    const items: Story[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Story, "id">) }));
    setStories(items);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Truyện chữ</h1>
        {userId && (
          <div className="mt-4 flex items-center gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Tiêu đề truyện mới"
              className="flex-1 rounded border px-3 py-2 text-sm bg-white dark:bg-black text-black dark:text-zinc-50"
            />
            <button onClick={createStory} className="rounded border px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">
              Thêm truyện
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
    </div>
  );
}
