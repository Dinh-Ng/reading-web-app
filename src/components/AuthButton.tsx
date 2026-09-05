"use client";
import { useEffect, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { onAuthStateChanged, signInWithRedirect, getRedirectResult, signOut, type User } from "firebase/auth";

interface HeaderRightProps {
  onOpenAddStory?: () => void;
}

export default function HeaderRight({ onOpenAddStory }: HeaderRightProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          // onAuthStateChanged handles state update
        }
      })
      .catch((error: any) => {
        if (
          error?.code !== "auth/cancelled-popup-request" &&
          error?.code !== "auth/popup-closed-by-user"
        ) {
          console.error("Redirect login error:", error);
        }
      });

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    if (!auth || authLoading) return;
    setAuthLoading(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error: any) {
      console.error("Login error:", error);
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!auth || authLoading) return;
    setAuthLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500 min-h-[44px] px-3">
        <div className="w-4 h-4 border-2 border-zinc-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Add story button — only when logged in and callback provided */}
      {user && onOpenAddStory && (
        <button
          type="button"
          onClick={onOpenAddStory}
          aria-label="Thêm truyện mới"
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs sm:text-sm font-semibold shadow-md shadow-purple-500/20 hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Thêm truyện</span>
        </button>
      )}

      {user ? (
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50 min-h-[40px]">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-7 h-7 rounded-full ring-2 ring-purple-500/30 object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden md:inline text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 max-w-[100px] truncate">
              {user.displayName || user.email || "User"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            disabled={authLoading}
            aria-label="Đăng xuất"
            className="min-h-[40px] px-3 sm:px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-800/50 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleLogin}
          disabled={authLoading}
          aria-label="Đăng nhập với Google"
          className="min-h-[40px] px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs sm:text-sm font-semibold shadow-md shadow-purple-500/20 hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
        >
          {authLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="hidden sm:inline">Đang chuyển hướng...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Đăng nhập</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
