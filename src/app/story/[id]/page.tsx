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
        if (!db) {
          setLoading(false);
          return;
        }
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
    if (!auth) return;
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
    if (!canManage || !story || !db) return;
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
    if (!canManage || !story || !db) return;
    if (!confirm("Bạn có chắc chắn muốn xóa truyện này?")) return;

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
    if (!canManage || !story || !db) return;
    const title = chapterTitle.trim();
    const content = chapterContent.trim();
    if (!title || !content) return;

    let index: number;
    if (chapterIndex.trim()) {
      index = parseInt(chapterIndex);
    } else {
      const maxIndex = chapters.reduce((max, ch) => {
        const idx = ch.index ?? -1;
        return idx > max ? idx : max;
      }, -1);
      index = maxIndex + 1;
    }

    const chapterData = { title, content, index };
    const chaptersRef = collection(db, "stories", story.id, "chapters");
    await addDoc(chaptersRef, chapterData);

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
    if (!canManage || !story || !editingChapterId || !db) return;
    const title = chapterTitle.trim();
    const content = chapterContent.trim();
    if (!title || !content) return;

    const updates: Partial<Chapter> = { title, content };
    if (chapterIndex.trim()) {
      updates.index = parseInt(chapterIndex);
    }

    const chapterRef = doc(db, "stories", story.id, "chapters", editingChapterId);
    await updateDoc(chapterRef, updates);

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
    if (!canManage || !story || !db) return;
    if (!confirm("Bạn có chắc chắn muốn xóa chương này?")) return;

    const chapterRef = doc(db, "stories", story.id, "chapters", chapterId);
    await deleteDoc(chapterRef);
    setChapters(chapters.filter((c) => c.id !== chapterId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-purple-50/30 to-pink-50/30 dark:from-zinc-950 dark:via-purple-950/20 dark:to-pink-950/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Đang tải truyện…</p>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-purple-50/30 to-pink-50/30 dark:from-zinc-950 dark:via-purple-950/20 dark:to-pink-950/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Không tìm thấy truyện</h2>
          <Link href="/" className="text-purple-600 dark:text-purple-400 hover:underline">
            ← Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-purple-50/30 to-pink-50/30 dark:from-zinc-950 dark:via-purple-950/20 dark:to-pink-950/20">
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors mb-6 group"
        >
          <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Quay lại trang chủ
        </Link>

        {/* Story Header */}
        <div className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-8 mb-8 border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-slideUp">
          {/* Gradient overlay */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>

          <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4 leading-tight">
                {story.title}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm">
                {story.author && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {story.authorLink ? (
                      <a href={story.authorLink} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline dark:text-purple-400 font-medium">
                        {story.author}
                      </a>
                    ) : (
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{story.author}</span>
                    )}
                  </div>
                )}
                {story.source && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <svg className="w-4 h-4 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{story.source}</span>
                  </div>
                )}
              </div>
            </div>
            {canManage && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={openStoryEditModal}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Sửa
                </button>
                <button
                  onClick={deleteStory}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
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
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-8 border border-zinc-200 dark:border-zinc-800 animate-slideUp" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              Danh sách chương
              <span className="text-lg font-normal text-zinc-500 dark:text-zinc-400">({chapters.length})</span>
            </h2>
            {canManage && (
              <button
                onClick={openCreateChapterModal}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Thêm chương
              </button>
            )}
          </div>

          {chapters.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
                <svg className="w-10 h-10 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2">Chưa có chương nào</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {canManage ? "Nhấn \"Thêm chương\" để bắt đầu" : "Truyện này chưa có chương nào"}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {chapters.map((c, index) => (
                <div
                  key={c.id}
                  className="group relative flex items-center justify-between p-4 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-950/30 dark:hover:to-pink-950/30 transition-all duration-300 border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <Link
                    href={`/story/${story.id}/chapter/${c.id}`}
                    className="flex-1 flex items-center gap-4"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                      <span className="text-white font-bold text-lg">{c.index ?? index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                        {c.title}
                      </h3>
                    </div>
                    <svg className="w-5 h-5 text-zinc-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transform group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  {canManage && (
                    <div className="ml-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditChapterModal(c)}
                        className="flex items-center gap-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Sửa
                      </button>
                      <button
                        onClick={() => deleteChapter(c.id)}
                        className="flex items-center gap-1 rounded-lg bg-red-100 dark:bg-red-900/30 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
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
            </div>
          )}
        </div>
      </main>

      {/* Story Edit Modal */}
      {isStoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4"
          onClick={closeStoryModal}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-2xl animate-scaleIn border border-zinc-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeStoryModal}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Sửa thông tin truyện</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Cập nhật thông tin truyện của bạn</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Nhập tiêu đề truyện"
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Tác giả</label>
                <input
                  type="text"
                  value={authorInput}
                  onChange={(e) => setAuthorInput(e.target.value)}
                  placeholder="Nhập tên tác giả"
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Link tác giả</label>
                <input
                  type="url"
                  value={authorLinkInput}
                  onChange={(e) => setAuthorLinkInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Nguồn</label>
                <input
                  type="text"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  placeholder="Nhập nguồn truyện"
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={closeStoryModal}
                className="flex-1 rounded-xl border-2 border-zinc-300 dark:border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={saveStory}
                disabled={!titleInput.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 disabled:hover:scale-100"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4"
          onClick={closeChapterModal}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-2xl animate-scaleIn border border-zinc-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeChapterModal}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {chapterMode === "create" ? "Thêm chương mới" : "Sửa chương"}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {chapterMode === "create" ? "Tạo chương mới cho truyện" : "Cập nhật thông tin chương"}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="Nhập tiêu đề chương"
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Số thứ tự (để trống để tự động gán)
                </label>
                <input
                  type="number"
                  value={chapterIndex}
                  onChange={(e) => setChapterIndex(e.target.value)}
                  placeholder="Tự động"
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Nội dung <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
                  placeholder="Nhập nội dung chương"
                  rows={14}
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-vertical font-mono"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={closeChapterModal}
                className="flex-1 rounded-xl border-2 border-zinc-300 dark:border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={chapterMode === "create" ? createChapter : updateChapter}
                disabled={!chapterTitle.trim() || !chapterContent.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 disabled:hover:scale-100"
              >
                {chapterMode === "create" ? "Thêm chương" : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
