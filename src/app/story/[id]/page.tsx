"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, deleteDoc, doc, getDoc, getDocs, updateDoc, addDoc } from "firebase/firestore";
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

  // Chapter management states
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [chapterMode, setChapterMode] = useState<"create" | "edit">("create");
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [chapterIndex, setChapterIndex] = useState("");

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

  const openCreateChapterModal = () => {
    setChapterMode("create");
    setChapterTitle("");
    setChapterContent("");
    setChapterIndex("");
    setEditingChapterId(null);
    setIsChapterModalOpen(true);
  };

  const openEditChapterModal = (chapter: Chapter) => {
    setChapterMode("edit");
    setChapterTitle(chapter.title);
    setChapterContent(chapter.content);
    setChapterIndex(chapter.index?.toString() ?? "");
    setEditingChapterId(chapter.id);
    setIsChapterModalOpen(true);
  };

  const closeChapterModal = () => {
    setIsChapterModalOpen(false);
    setChapterTitle("");
    setChapterContent("");
    setChapterIndex("");
    setEditingChapterId(null);
  };

  const createChapter = async () => {
    if (!canManage || !story) return;
    const title = chapterTitle.trim();
    const content = chapterContent.trim();
    if (!title || !content) return;

    // Auto-assign index if not provided
    let index: number;
    if (chapterIndex.trim()) {
      index = parseInt(chapterIndex);
    } else {
      // Find the highest index and add 1
      const maxIndex = chapters.reduce((max, ch) => {
        const idx = ch.index ?? -1;
        return idx > max ? idx : max;
      }, -1);
      index = maxIndex + 1;
    }

    const chapterData = {
      title,
      content,
      index,
    };

    const chaptersRef = collection(db, "stories", story.id, "chapters");
    await addDoc(chaptersRef, chapterData);

    // Refresh chapters list
    const snap = await getDocs(chaptersRef);
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
    closeChapterModal();
  };

  const updateChapter = async () => {
    if (!canManage || !story || !editingChapterId) return;
    const title = chapterTitle.trim();
    const content = chapterContent.trim();
    if (!title || !content) return;

    const updates: Partial<Chapter> = {
      title,
      content,
    };

    if (chapterIndex.trim()) {
      updates.index = parseInt(chapterIndex);
    }

    const chapterRef = doc(db, "stories", story.id, "chapters", editingChapterId);
    await updateDoc(chapterRef, updates);

    // Refresh chapters list
    const chaptersRef = collection(db, "stories", story.id, "chapters");
    const snap = await getDocs(chaptersRef);
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
    closeChapterModal();
  };

  const deleteChapter = async (chapterId: string) => {
    if (!canManage || !story) return;
    if (!confirm("Bạn có chắc chắn muốn xóa chương này?")) return;

    const chapterRef = doc(db, "stories", story.id, "chapters", chapterId);
    await deleteDoc(chapterRef);

    // Remove from local state
    setChapters(chapters.filter((c) => c.id !== chapterId));
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
        {canManage && (
          <button
            onClick={openCreateChapterModal}
            className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Thêm chương
          </button>
        )}
        <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
          {chapters.map((c) => (
            <li key={c.id} className="py-2 flex items-center justify-between">
              <Link
                href={`/story/${story.id}/chapter/${c.id}`}
                className="text-blue-600 dark:text-blue-400 flex-1"
              >
                {c.index != null ? `Chương ${c.index}: ` : "Chương: "}
                {c.title}
              </Link>
              {canManage && (
                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => openEditChapterModal(c)}
                    className="rounded border px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => deleteChapter(c.id)}
                    className="rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    Xóa
                  </button>
                </div>
              )}
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

      {/* Chapter Modal */}
      {isChapterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={closeChapterModal}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeChapterModal}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal header */}
            <h2 className="text-xl font-semibold text-black dark:text-white mb-6">
              {chapterMode === "create" ? "Thêm chương mới" : "Sửa chương"}
            </h2>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="Nhập tiêu đề chương"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Số thứ tự (để trống để tự động gán)
                </label>
                <input
                  type="number"
                  value={chapterIndex}
                  onChange={(e) => setChapterIndex(e.target.value)}
                  placeholder="Tự động"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Nội dung <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
                  placeholder="Nhập nội dung chương"
                  rows={12}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={closeChapterModal}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={chapterMode === "create" ? createChapter : updateChapter}
                disabled={!chapterTitle.trim() || !chapterContent.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {chapterMode === "create" ? "Thêm chương" : "Lưu thay đổi"}
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
