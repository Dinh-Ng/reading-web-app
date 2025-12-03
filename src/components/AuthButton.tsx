"use client";
import { useEffect, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) return <div className="text-sm text-zinc-500">…</div>;

  return user ? (
    <button onClick={handleLogout} className="rounded border px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300">
      Đăng xuất ({user.displayName ?? user.email ?? "User"})
    </button>
  ) : (
    <button onClick={handleLogin} className="rounded border px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300">
      Đăng nhập với Google
    </button>
  );
}

