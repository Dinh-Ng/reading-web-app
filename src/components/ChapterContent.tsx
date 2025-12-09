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
      setFontSize(Number(savedFontSize));
    }
  }, []);

  // Save font size to localStorage when it changes
  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem("reading-font-size", size.toString());
  };
  const parseContent = (text: string) => {
    const lines = text.split('\n');
    const elements: ReactNode[] = [];

    lines.forEach((line, index) => {
      // Check for horizontal divider (---)
      if (line.trim() === '---') {
        elements.push(
          <hr key={index} className="my-8 border-t-2 border-zinc-300 dark:border-zinc-700" />
        );
        return;
      }

      // Check for header (##)
      if (line.trim().startsWith('##')) {
        const headerText = line.trim().substring(2).trim();
        elements.push(
          <h2 key={index} className="text-2xl font-bold text-zinc-900 dark:text-white mt-8 mb-4">
            {headerText}
          </h2>
        );
        return;
      }

      // Process line for **text** (uppercase)
      const processedLine = processInlineFormatting(line);

      if (line.trim()) {
        elements.push(
          <p key={index} className="mb-4 indent-8">
            {processedLine}
          </p>
        );
      } else {
        // Empty line - add spacing
        elements.push(<div key={index} className="h-4" />);
      }
    });

    return elements;
  };

  const processInlineFormatting = (line: string) => {
    const parts: (string | ReactNode)[] = [];
    let currentIndex = 0;

    // Combined regex to find both **text** (bold) and "text" (italic dialogue)
    const formattingPattern = /(\*\*(.*?)\*\*)|("(.*?)")/g;
    let match;
    let lastIndex = 0;

    while ((match = formattingPattern.exec(line)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }

      // Check which pattern matched
      if (match[1]) {
        // **bold** pattern matched
        parts.push(
          <span key={`bold-${currentIndex++}`} className="font-bold">
            {match[2]}
          </span>
        );
      } else if (match[3]) {
        // "dialogue" pattern matched
        parts.push(
          <span key={`italic-${currentIndex++}`} className="italic">
            "{match[4]}"
          </span>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    return parts.length > 0 ? parts : line;
  };

  return (
    <div className="relative">
      <article
        className="reading-content text-zinc-800 dark:text-zinc-200"
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
