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

  // Story editing modal states
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
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

  const openStoryEditModal = () => {
    if (!story) return;
    setTitleInput(story.title);
    setAuthorInput(story.author || "");
    setAuthorLinkInput(story.authorLink || "");
    setSourceInput(story.source || "");
    setIsStoryModalOpen(true);
  };

  const closeStoryModal = () => {
    setIsStoryModalOpen(false);
    setTitleInput("");
    setAuthorInput("");
    setAuthorLinkInput("");
    setSourceInput("");
  };

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
    closeStoryModal();
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
      <main className="mx-auto max-w-4xl p-6">
        {/* Story Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-black dark:text-white mb-3">{story.title}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                {story.author && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>
                      {story.authorLink ? (
                        <a href={story.authorLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400 font-medium">
                          {story.author}
                        </a>
                      ) : (
                        <span className="font-medium">{story.author}</span>
                      )}
                    </span>
                  </div>
                )}
                {story.source && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="font-medium">{story.source}</span>
                  </div>
                )}
              </div>
            </div>
            {canManage && (
              <div className="ml-4 flex items-center gap-2">
                <button
                  onClick={openStoryEditModal}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Sửa
                </button>
                <button
                  onClick={deleteStory}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Xóa
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Chapters Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black dark:text-white flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Danh sách chương
            </h2>
            {canManage && (
              <button
                onClick={openCreateChapterModal}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Thêm chương
              </button>
            )}
          </div>

          <div className="space-y-2">
            {chapters.map((c, index) => (
              <div key={c.id} className="group flex items-center justify-between p-4 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700">
                <Link
                  href={`/story/${story.id}/chapter/${c.id}`}
                  className="flex-1 flex items-center gap-3"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                    {c.index ?? index + 1}
                  </span>
                  <span className="text-base font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {c.title}
                  </span>
                </Link>
                {canManage && (
                  <div className="ml-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditChapterModal(c)}
                      className="flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Sửa
                    </button>
                    <button
                      onClick={() => deleteChapter(c.id)}
                      className="flex items-center gap-1 rounded-lg bg-red-50 dark:bg-red-950 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Xóa
                    </button>
                  </div>
                )}
              </div>
            ))}
            {chapters.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">Chưa có chương nào</p>
                {canManage && (
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">Nhấn "Thêm chương" để bắt đầu</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại danh sách truyện
          </Link>
        </div>
      </main>

      {/* Story Edit Modal */}
      {isStoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={closeStoryModal}
        >
          <div
            className="relative w-full max-w-md rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeStoryModal}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal header */}
            <h2 className="text-xl font-semibold text-black dark:text-white mb-6">
              Sửa thông tin truyện
            </h2>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
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
                  value={authorInput}
                  onChange={(e) => setAuthorInput(e.target.value)}
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
                  value={authorLinkInput}
                  onChange={(e) => setAuthorLinkInput(e.target.value)}
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
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  placeholder="Nhập nguồn truyện"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={closeStoryModal}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={saveStory}
                disabled={!titleInput.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

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
