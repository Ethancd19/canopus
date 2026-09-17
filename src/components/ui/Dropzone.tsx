"use client";

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";

const REJECTED_MESSAGE_MS = 3000;

type Props = {
  onFiles: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
  /** Compact row layout for when the queue already has items. */
  compact?: boolean;
  children: ReactNode;
};

function matchesAccept(file: File, accept: string) {
  const patterns = accept
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (patterns.length === 0) return true;
  return patterns.some((pattern) => {
    if (pattern.endsWith("/*")) {
      return file.type.startsWith(pattern.slice(0, -1));
    }
    return file.type === pattern;
  });
}

export function Dropzone({ onFiles, accept, multiple = true, compact = false, children }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [rejected, setRejected] = useState(false);
  // Counts nested dragenter/dragleave pairs - a drag over a child element
  // fires a dragleave on the parent even though the pointer is still inside
  // the dropzone, so toggling on every dragleave causes the border to
  // flicker. Only clear `dragOver` when the depth returns to zero.
  const dragDepthRef = useRef(0);
  const rejectedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (rejectedTimeoutRef.current) clearTimeout(rejectedTimeoutRef.current);
    };
  }, []);

  const acceptFiles = (fileList: FileList | File[] | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).filter((f) => matchesAccept(f, accept));
    if (files.length > 0) {
      onFiles(files);
      return;
    }
    if (fileList.length > 0) {
      if (rejectedTimeoutRef.current) clearTimeout(rejectedTimeoutRef.current);
      setRejected(true);
      rejectedTimeoutRef.current = setTimeout(() => setRejected(false), REJECTED_MESSAGE_MS);
    }
  };

  const layout = compact
    ? "flex-row gap-3 p-4"
    : "flex-col gap-2 p-10";

  return (
    <label
      onDragEnter={(e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        dragDepthRef.current += 1;
        setDragOver(true);
      }}
      onDragOver={(e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
      }}
      onDragLeave={() => {
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setDragOver(false);
      }}
      onDrop={(e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        dragDepthRef.current = 0;
        setDragOver(false);
        acceptFiles(e.dataTransfer?.files ?? null);
      }}
      className={`flex items-center justify-center border border-dashed rounded-sm text-muted cursor-pointer hover:border-copper/60 ${layout} ${
        dragOver ? "border-copper/60" : "border-text/20"
      }`}
    >
      {children}
      {rejected && (
        <p className="font-mono text-[12px] text-danger">Only JPEG, PNG, or WebP files are accepted.</p>
      )}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => acceptFiles(e.target.files)}
        className="sr-only"
      />
    </label>
  );
}
