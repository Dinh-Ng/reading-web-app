import type { Story } from "@/types/story";

export interface StoriesCache {
  stories: Story[];
  chapterCounts: Map<string, number>;
  timestamp: number;
}

// In-memory cache for client-side navigation
let memoryCache: StoriesCache | null = null;

const SCROLL_POS_KEY = "reading_app_home_scroll";

/**
 * Retrieve cached stories and chapter counts from memory
 */
export function getCachedStories(): StoriesCache | null {
  return memoryCache;
}

/**
 * Store stories and chapter counts into memory cache
 */
export function setCachedStories(stories: Story[], chapterCounts: Map<string, number>): void {
  memoryCache = {
    stories: [...stories],
    chapterCounts: new Map(chapterCounts),
    timestamp: Date.now(),
  };
}

/**
 * Invalidate in-memory cache to force a fresh fetch
 */
export function invalidateStoriesCache(): void {
  memoryCache = null;
}

/**
 * Update an existing story in cache without full refetch
 */
export function updateCachedStory(storyId: string, updates: Partial<Story>): void {
  if (!memoryCache) return;
  memoryCache.stories = memoryCache.stories.map((s) =>
    s.id === storyId ? { ...s, ...updates } : s
  );
}

/**
 * Remove a deleted story from cache
 */
export function removeCachedStory(storyId: string): void {
  if (!memoryCache) return;
  memoryCache.stories = memoryCache.stories.filter((s) => s.id !== storyId);
  memoryCache.chapterCounts.delete(storyId);
}

/**
 * Update chapter count for a story in cache
 */
export function updateCachedChapterCount(storyId: string, count: number): void {
  if (!memoryCache) return;
  memoryCache.chapterCounts.set(storyId, count);
}

/**
 * Save scroll position for home page into sessionStorage
 */
export function saveHomeScrollPosition(scrollY: number): void {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(SCROLL_POS_KEY, scrollY.toString());
    } catch {
      // Ignore storage errors (e.g. incognito quota)
    }
  }
}

/**
 * Get saved scroll position for home page
 */
export function getHomeScrollPosition(): number {
  if (typeof window !== "undefined") {
    try {
      const saved = sessionStorage.getItem(SCROLL_POS_KEY);
      if (saved) {
        const pos = parseInt(saved, 10);
        return isNaN(pos) ? 0 : pos;
      }
    } catch {
      return 0;
    }
  }
  return 0;
}

/**
 * Clear saved home scroll position
 */
export function clearHomeScrollPosition(): void {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(SCROLL_POS_KEY);
    } catch {
      // Ignore
    }
  }
}
