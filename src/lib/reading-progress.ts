import type { ReadingProgress } from "@/types/reading-progress";

const STORAGE_PREFIX = "reading-progress-";
const MAX_AGE_DAYS = 30;

/**
 * Save reading progress for a story
 */
export function saveReadingProgress(storyId: string, progress: ReadingProgress): void {
  if (typeof window === "undefined") return;

  try {
    const key = `${STORAGE_PREFIX}${storyId}`;
    localStorage.setItem(key, JSON.stringify(progress));
  } catch (error) {
    console.error("Failed to save reading progress:", error);
  }
}

/**
 * Get reading progress for a story
 */
export function getReadingProgress(storyId: string): ReadingProgress | null {
  if (typeof window === "undefined") return null;

  try {
    const key = `${STORAGE_PREFIX}${storyId}`;
    const data = localStorage.getItem(key);

    if (!data) return null;

    const progress: ReadingProgress = JSON.parse(data);

    // Check if progress is too old
    const ageInDays = (Date.now() - progress.timestamp) / (1000 * 60 * 60 * 24);
    if (ageInDays > MAX_AGE_DAYS) {
      clearReadingProgress(storyId);
      return null;
    }

    return progress;
  } catch (error) {
    console.error("Failed to get reading progress:", error);
    return null;
  }
}

/**
 * Clear reading progress for a story
 */
export function clearReadingProgress(storyId: string): void {
  if (typeof window === "undefined") return;

  try {
    const key = `${STORAGE_PREFIX}${storyId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear reading progress:", error);
  }
}

/**
 * Get all reading progress entries
 */
export function getAllReadingProgress(): Record<string, ReadingProgress> {
  if (typeof window === "undefined") return {};

  try {
    const allProgress: Record<string, ReadingProgress> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const storyId = key.replace(STORAGE_PREFIX, "");
        const progress = getReadingProgress(storyId);
        if (progress) {
          allProgress[storyId] = progress;
        }
      }
    }

    return allProgress;
  } catch (error) {
    console.error("Failed to get all reading progress:", error);
    return {};
  }
}

/**
 * Clean up old reading progress entries
 */
export function cleanupOldProgress(): void {
  if (typeof window === "undefined") return;

  try {
    const allProgress = getAllReadingProgress();
    const now = Date.now();

    Object.entries(allProgress).forEach(([storyId, progress]) => {
      const ageInDays = (now - progress.timestamp) / (1000 * 60 * 60 * 24);
      if (ageInDays > MAX_AGE_DAYS) {
        clearReadingProgress(storyId);
      }
    });
  } catch (error) {
    console.error("Failed to cleanup old progress:", error);
  }
}
