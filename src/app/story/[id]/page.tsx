"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import type { Story, Chapter } from "@/types/story";

export default function StoryPage() {
  const { id } = useParams<{ id: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const ref = doc(db, "stories", id);
        const s = await getDoc(ref);
        if (s.exists()) {
          setStory({ id: s.id, ...(s.data() as Omit<Story, "id">) });
        }
        const chCol = collection(db, "stories", id, "chapters");
        const snap = await getDocs(chCol);
        const list: Chapter[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Chapter, "id">) }));
        list.sort((a, b) => {
          const ai = a.index ?? Number.MAX_SAFE_INTEGER;
          const bi = b.index ?? Number.MAX_SAFE_INTEGER;
          if (ai !== bi) return ai - bi;
          const at = a.title?.toString() ?? "";
          const bt = b.title?.toString() ?? "";
          return at.localeCompare(bt);
        });
        setChapters(list);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="mx-auto max-w-3xl p-6 text-zinc-600 dark:text-zinc-400">Đang tải truyện…</div>;
  }

  if (!story) {
    return <div className="mx-auto max-w-3xl p-6 text-red-600">Không tìm thấy truyện</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">{story.title}</h1>
        <h2 className="mt-4 text-lg font-medium text-black dark:text-zinc-50">Danh sách chương</h2>
        <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
          {chapters.map((c) => (
            <li key={c.id} className="py-2">
              <Link
                href={`/story/${story.id}/chapter/${c.id}`}
                className="text-blue-600 dark:text-blue-400"
              >
                {c.index != null ? `Chương ${c.index}: ` : "Chương: "}
                {c.title}
              </Link>
            </li>
          ))}
          {chapters.length === 0 && (
            <li className="py-2 text-zinc-600 dark:text-zinc-400">Chưa có chương</li>
          )}
        </ul>
        <div className="mt-6">
          <Link href="/" className="text-sm text-zinc-600 dark:text-zinc-400">
            ← Quay lại danh sách truyện
          </Link>
        </div>
      </main>
    </div>
  );
}
