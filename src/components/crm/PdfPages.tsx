import { useEffect, useRef, useState } from "react";

export interface RenderedPage {
  index: number;
  dataUrl: string;
  width: number;
  height: number;
}

/** Renders every page of a PDF to images in the browser (pdf.js), so we can overlay fields. */
export function usePdfPages(fileUrl: string, scale = 1.6) {
  const [pages, setPages] = useState<RenderedPage[] | null>(null);
  const [error, setError] = useState("");
  const token = useRef(0);

  useEffect(() => {
    if (!fileUrl) return;
    const run = ++token.current;
    setPages(null);
    setError("");
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const doc = await pdfjs.getDocument({ url: fileUrl }).promise;
        const out: RenderedPage[] = [];
        for (let i = 1; i <= doc.numPages; i += 1) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvas, canvasContext: ctx, viewport } as never).promise;
          out.push({
            index: i,
            dataUrl: canvas.toDataURL("image/jpeg", 0.85),
            width: canvas.width,
            height: canvas.height,
          });
        }
        if (token.current === run) setPages(out);
      } catch (err) {
        if (token.current === run) {
          setError(err instanceof Error ? err.message : "Could not open this PDF.");
          setPages([]);
        }
      }
    })();
  }, [fileUrl, scale]);

  return { pages, error };
}

/** Counts pages of a local File before upload. */
export async function countPdfPages(file: File): Promise<number> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  return doc.numPages;
}
