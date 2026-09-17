"use client";

import { useState, type KeyboardEvent } from "react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  id?: string;
};

function normalize(raw: string) {
  return raw.trim().toLowerCase();
}

export function TagInput({ value, onChange, suggestions, placeholder, id }: Props) {
  const [text, setText] = useState("");

  const addTag = (raw: string) => {
    const tag = normalize(raw);
    setText("");
    if (!tag) return;
    if (value.includes(tag)) {
      onChange(value);
      return;
    }
    onChange([...value, tag]);
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(text);
      return;
    }
    if (e.key === "Backspace" && text === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const matches =
    text.trim() && suggestions
      ? suggestions.filter(
          (s) => s.toLowerCase().startsWith(text.trim().toLowerCase()) && !value.includes(s.toLowerCase())
        )
      : [];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5 w-full min-h-9 rounded-sm bg-navy-mid border border-text/10 px-2 py-1.5 focus-within:border-ice/60">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-navy-light text-text text-[12px] px-2 py-0.5 rounded-sm"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => removeTag(tag)}
              className="text-faint hover:text-text"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-w-[6ch] bg-transparent font-mono text-[13px] text-text placeholder:text-faint focus:outline-none"
        />
      </div>
      {matches.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {matches.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => addTag(s)}
                className="text-[12px] text-muted hover:text-text px-1.5 py-0.5 rounded-sm border border-text/10"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
