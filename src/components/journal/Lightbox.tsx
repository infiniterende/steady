"use client";

import { useEffect } from "react";

export function Lightbox({
  photos,
  index,
  onClose,
  onIndex,
}: {
  photos: { id: string; url: string }[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const prev = () => onIndex((index - 1 + photos.length) % photos.length);
  const next = () => onIndex((index + 1) % photos.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  });

  const p = photos[index];
  if (!p) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(58,53,48,0.85)] p-4 backdrop-blur-sm"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={p.url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
      />
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 grid h-10 w-10 cursor-pointer place-items-center rounded-full border-0 bg-white/15 text-xl text-white hover:bg-white/25"
      >
        ×
      </button>
      {photos.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-0 bg-white/15 text-2xl text-white hover:bg-white/25"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-0 bg-white/15 text-2xl text-white hover:bg-white/25"
          >
            ›
          </button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 font-mono text-xs text-white">
            {index + 1} / {photos.length}
          </span>
        </>
      )}
    </div>
  );
}
