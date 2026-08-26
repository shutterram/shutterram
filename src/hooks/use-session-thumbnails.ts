import { useEffect, useRef, useState } from "react";

/**
 * Fetches every grid thumbnail once and retains the bytes as blob URLs for the
 * page session. Without this, Safari discards off-screen tiles and re-requests
 * them while scrolling, which reads as thumbnails "unloading".
 */
export function useSessionThumbnails(entries: { id: string; src: string }[]) {
  const [thumbs, setThumbs] = useState<Map<string, string>>(new Map());
  const urls = useRef<string[]>([]);
  const signature = entries.map((e) => `${e.id}:${e.src}`).join("|");

  useEffect(() => {
    if (entries.length === 0) {
      setThumbs(new Map());
      return;
    }

    const controller = new AbortController();
    const queue = entries.slice();
    const retained = new Map<string, string>();
    let cursor = 0;

    async function worker() {
      while (!controller.signal.aborted) {
        const entry = queue[cursor++];
        if (!entry) return;
        try {
          const response = await fetch(entry.src, {
            cache: "force-cache",
            signal: controller.signal,
          });
          if (!response.ok) continue;
          const objectUrl = URL.createObjectURL(await response.blob());
          retained.set(entry.id, objectUrl);
          urls.current.push(objectUrl);
          setThumbs(new Map(retained));
        } catch {
          // Keep the original URL as a graceful fallback.
        }
      }
    }

    setThumbs(new Map());
    void Promise.all(Array.from({ length: Math.min(8, queue.length) }, () => worker()));

    return () => {
      controller.abort();
      for (const objectUrl of urls.current) URL.revokeObjectURL(objectUrl);
      urls.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return thumbs;
}
