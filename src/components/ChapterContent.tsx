"use client";
import React, { ReactNode, useState, useEffect } from "react";
import ReadingSettings from "./ReadingSettings";
import FloatingSettingsButton from "./FloatingSettingsButton";

interface ChapterContentProps {
  content: string;
}

export default function ChapterContent({ content }: ChapterContentProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(18); // Default font size

  // Load font size from localStorage on mount
  useEffect(() => {
    const savedFontSize = localStorage.getItem("reading-font-size");
    if (savedFontSize) {
      const parsed = Number(savedFontSize);
      if (!isNaN(parsed) && parsed >= 14 && parsed <= 26) {
        setFontSize(parsed);
      }
    }
  }, []);

  // Save font size to localStorage when it changes
  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem("reading-font-size", size.toString());
  };

  const processInlineFormatting = (line: string) => {
    const parts: (string | ReactNode)[] = [];
    let currentIndex = 0;

    // Combined regex to find both **text** (bold) and "text" (dialogue)
    const formattingPattern = /(\*\*(.*?)\*\*)|("(.*?)")/g;
    let match;
    let lastIndex = 0;

    while ((match = formattingPattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }

      if (match[1]) {
        // **bold** pattern matched
        parts.push(
          <strong key={`bold-${currentIndex++}`} className="font-bold text-zinc-950 dark:text-white">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // "dialogue" pattern matched
        parts.push(
          <span key={`dialogue-${currentIndex++}`} className="text-zinc-900 dark:text-zinc-100 font-medium">
            "{match[4]}"
          </span>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    return parts.length > 0 ? parts : line;
  };

  const parseContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    const elements: ReactNode[] = [];

    lines.forEach((rawLine, index) => {
      const line = rawLine.trim();

      // Check for horizontal divider (---)
      if (line === '---' || line === '***' || line === '___') {
        elements.push(
          <div key={`divider-${index}`} className="my-8 sm:my-10 flex items-center justify-center gap-3">
            <span className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1 max-w-[80px]" />
            <span className="text-zinc-400 dark:text-zinc-600 text-xs tracking-widest">✦ ✦ ✦</span>
            <span className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1 max-w-[80px]" />
          </div>
        );
        return;
      }

      // Check for header (##)
      if (line.startsWith('##')) {
        const headerText = line.replace(/^#+\s*/, '');
        elements.push(
          <h2 key={`h2-${index}`} className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mt-8 mb-4 tracking-tight">
            {headerText}
          </h2>
        );
        return;
      }

      // Check for quote/note (> )
      if (line.startsWith('>')) {
        const quoteText = line.replace(/^>\s*/, '');
        elements.push(
          <blockquote key={`quote-${index}`} className="border-l-4 border-purple-500 pl-4 py-1.5 my-4 italic text-zinc-600 dark:text-zinc-400 bg-purple-50/40 dark:bg-purple-950/20 rounded-r-xl">
            {processInlineFormatting(quoteText)}
          </blockquote>
        );
        return;
      }

      if (line) {
        const processedLine = processInlineFormatting(rawLine.trim());
        elements.push(
          <p key={`p-${index}`} className="mb-5 sm:mb-6 text-justify leading-relaxed">
            {processedLine}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="relative">
      <article
        className="reading-content text-zinc-800 dark:text-zinc-200 select-text"
        style={{ fontSize: `${fontSize}px` }}
      >
        {parseContent(content)}
      </article>

      {/* Floating Settings Button */}
      <FloatingSettingsButton onClick={() => setIsSettingsOpen(true)} />

      {/* Reading Settings Popup */}
      <ReadingSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        fontSize={fontSize}
        onFontSizeChange={handleFontSizeChange}
      />
    </div>
  );
}
