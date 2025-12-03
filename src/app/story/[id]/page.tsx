"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, deleteDoc, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { Story, Chapter } from "@/types/story";

export default function StoryPage() {
  const { id } = useParams<{ id: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [authorInput, setAuthorInput] = useState("");
  const [authorLinkInput, setAuthorLinkInput] = useState("");
  const [sourceInput, setSourceInput] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const ref = doc(db, "stories", id);
        const s = await getDoc(ref);
        if (s.exists()) {
          const data = s.data() as Omit<Story, "id">;
          setStory({ id: s.id, ...data });
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null));
    return () => unsub();
  }, []);

  const canManage = !!userId && !!story && story.createdBy === userId;

  const saveStory = async () => {
    if (!canManage || !story) return;
    const newTitle = titleInput.trim();
    if (!newTitle) return;

    const updates = {
      title: newTitle,
      author: authorInput.trim(),
      authorLink: authorLinkInput.trim(),
      source: sourceInput.trim(),
    };

    await updateDoc(doc(db, "stories", story.id), updates);
    setStory({ ...story, ...updates });
    setEditing(false);
  };

  const deleteStory = async () => {
    if (!canManage || !story) return;
    const storyRef = doc(db, "stories", story.id);
    const chSnap = await getDocs(collection(db, "stories", story.id, "chapters"));
    await Promise.all(chSnap.docs.map((d) => deleteDoc(doc(storyRef, "chapters", d.id))));
    await deleteDoc(storyRef);
    window.location.href = "/";
  };

  if (loading) {
    return <div className="mx-auto max-w-3xl p-6 text-zinc-600 dark:text-zinc-400">Đang tải truyện…</div>;
  }

  if (!story) {
    return <div className="mx-auto max-w-3xl p-6 text-red-600">Không tìm thấy truyện</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl p-6">
        <div className="flex items-center justify-between">
          {editing ? (
            <div className="flex-1 flex flex-col gap-2">
              <input
                className="w-full rounded border px-3 py-2 text-sm bg-white dark:bg-black text-black dark:text-zinc-50"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Tên truyện"
              />
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded border px-3 py-2 text-sm bg-white dark:bg-black text-black dark:text-zinc-50"
                  value={authorInput}
                  onChange={(e) => setAuthorInput(e.target.value)}
                  placeholder="Tên tác giả"
                />
                <input
                  className="flex-1 rounded border px-3 py-2 text-sm bg-white dark:bg-black text-black dark:text-zinc-50"
                  value={authorLinkInput}
                  onChange={(e) => setAuthorLinkInput(e.target.value)}
                  placeholder="Link tác giả (nếu có)"
                />
              </div>
              <input
                className="w-full rounded border px-3 py-2 text-sm bg-white dark:bg-black text-black dark:text-zinc-50"
                value={sourceInput}
                onChange={(e) => setSourceInput(e.target.value)}
                placeholder="Nguồn truyện"
              />
              <div className="flex gap-2">
                <button onClick={saveStory} className="rounded border px-3 py-2 text-sm">Lưu</button>
                <button onClick={() => setEditing(false)} className="rounded border px-3 py-2 text-sm">Hủy</button>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">{story.title}</h1>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {story.author && (
                  <span className="mr-4">
                    Tác giả:{" "}
                    {story.authorLink ? (
                      <a href={story.authorLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                        {story.author}
                      </a>
                    ) : (
                      story.author
                    )}
                  </span>
                )}
                {story.source && (
                  <span>
                    Nguồn: {story.source}
                  </span>
                )}
              </div>
            </div>
          )}
          {canManage && !editing && (
            <div className="ml-4 flex items-center gap-2 self-start">
              <button onClick={() => {
                setEditing(true);
                setTitleInput(story.title);
                setAuthorInput(story.author || "");
                setAuthorLinkInput(story.authorLink || "");
                setSourceInput(story.source || "");
              }} className="rounded border px-3 py-2 text-sm">Sửa</button>
              <button onClick={deleteStory} className="rounded border px-3 py-2 text-sm text-red-600">Xóa</button>
            </div>
          )}
        </div>
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
