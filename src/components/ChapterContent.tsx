"use client";
import React, { ReactNode } from "react";

interface ChapterContentProps {
  content: string;
}

export default function ChapterContent({ content }: ChapterContentProps) {
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
    <article className="reading-content text-zinc-800 dark:text-zinc-200">
      {parseContent(content)}
    </article>
  );
}
