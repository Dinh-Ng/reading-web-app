"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import type { Chapter, Story } from "@/types/story";

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

  if (loading) return <div className="mx-auto max-w-3xl p-6 text-zinc-600 dark:text-zinc-400">Đang tải chương…</div>;
  if (!chapter) return <div className="mx-auto max-w-3xl p-6 text-red-600">Không tìm thấy chương</div>;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <Link href={`/story/${id}`} className="text-sm text-zinc-600 dark:text-zinc-400">← {story?.title ?? "Truyện"}</Link>
          <div className="flex gap-2">
            {prevChapter && (
              <Link href={`/story/${id}/chapter/${prevChapter.id}`} className="rounded border px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300">
                ◀ Trước
              </Link>
            )}
            {nextChapter && (
              <Link href={`/story/${id}/chapter/${nextChapter.id}`} className="rounded border px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300">
                Sau ▶
              </Link>
            )}
          </div>
        </div>
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          {chapter.index != null ? `Chương ${chapter.index}: ` : "Chương: "}
          {chapter.title}
        </h1>
        <article className="mt-6 text-[17px] leading-8 text-black dark:text-zinc-50" style={{ whiteSpace: "pre-wrap" }}>
          {chapter.content}
        </article>
        <div className="mt-6 flex items-center justify-between">
          {prevChapter ? (
            <Link href={`/story/${id}/chapter/${prevChapter.id}`} className="text-blue-600 dark:text-blue-400">◀ Chương trước</Link>
          ) : <span />}
          {nextChapter ? (
            <Link href={`/story/${id}/chapter/${nextChapter.id}`} className="text-blue-600 dark:text-blue-400">Chương sau ▶</Link>
          ) : <span />}
        </div>
      </main>
    </div>
  );
}
