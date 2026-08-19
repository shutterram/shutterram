import { useEffect, useRef, useState } from "react";
import { Btn, Label } from "./ui";

const SIG_FONTS = [
  { id: "Dancing Script", label: "Flowing" },
  { id: "Great Vibes", label: "Formal" },
  { id: "Caveat", label: "Casual" },
  { id: "Sacramento", label: "Fine" },
];

let fontsRequested = false;
function ensureSignatureFonts() {
  if (fontsRequested || typeof document === "undefined") return;
  fontsRequested = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Dancing+Script:wght@600&family=Great+Vibes&family=Sacramento&display=swap";
  document.head.appendChild(link);
}

/** Renders typed text as a transparent signature PNG. */
async function textToPng(text: string, font: string): Promise<string> {
  ensureSignatureFonts();
  try {
    await document.fonts.load(`64px "${font}"`, text);
    await document.fonts.ready;
  } catch {
    /* fall back to whatever is available */
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const size = 96;
  ctx.font = `${size}px "${font}", cursive`;
  const width = Math.max(120, Math.ceil(ctx.measureText(text).width) + 40);
  canvas.width = width;
  canvas.height = Math.round(size * 1.8);
  const c = canvas.getContext("2d");
  if (!c) return "";
  c.font = `${size}px "${font}", cursive`;
  c.fillStyle = "#111111";
  c.textBaseline = "middle";
  c.fillText(text, 20, canvas.height / 2);
  return canvas.toDataURL("image/png");
}

/** Draw-or-type signature capture used by both the studio and the client page. */
export function SignatureInput({
  value,
  onChange,
  label = "Signature",
  height = 150,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  height?: number;
}) {
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [text, setText] = useState("");
  const [font, setFont] = useState(SIG_FONTS[0]!.id);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    ensureSignatureFonts();
  }, []);

  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111111";
  }, [height, mode]);

  useEffect(() => {
    if (mode !== "type") return;
    if (!text.trim()) return;
    let alive = true;
    void textToPng(text.trim(), font).then((url) => {
      if (alive && url) onChange(url);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, font, mode]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  const tab = (id: "draw" | "type", labelText: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setMode(id)}
      className={`px-3 py-1.5 text-[0.625rem] tracking-[0.2em] uppercase transition-colors ${
        mode === id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {labelText}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{label}</Label>
        <div className="flex border border-hairline">
          {tab("draw", "Draw")}
          {tab("type", "Type")}
        </div>
      </div>

      {mode === "draw" ? (
        <canvas
          ref={canvasRef}
          style={{ height }}
          className="mt-2 w-full touch-none border border-hairline bg-white"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const ctx = e.currentTarget.getContext("2d");
            if (!ctx) return;
            drawing.current = true;
            const p = pos(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const ctx = e.currentTarget.getContext("2d");
            if (!ctx) return;
            const p = pos(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }}
          onPointerUp={(e) => {
            drawing.current = false;
            onChange(e.currentTarget.toDataURL("image/png"));
          }}
        />
      ) : (
        <div className="mt-2 space-y-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your name"
            className="w-full border-0 border-b border-hairline bg-transparent py-2 text-sm outline-none focus:border-foreground"
          />
          <div className="grid grid-cols-2 gap-2">
            {SIG_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFont(f.id)}
                style={{ fontFamily: `"${f.id}", cursive` }}
                className={`border px-3 py-2 text-xl text-foreground transition-colors ${
                  font === f.id ? "border-foreground" : "border-hairline hover:border-foreground/60"
                }`}
              >
                {text.trim() || f.label}
              </button>
            ))}
          </div>
          {value ? (
            <div className="border border-hairline bg-white p-2">
              <img src={value} alt="Signature preview" className="mx-auto max-h-20" />
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <Btn
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            setText("");
            onChange("");
          }}
        >
          Clear
        </Btn>
      </div>
    </div>
  );
}
