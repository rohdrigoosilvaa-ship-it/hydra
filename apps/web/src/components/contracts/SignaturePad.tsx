import { forwardRef, useImperativeHandle, useRef, useState } from "react";

export interface SignaturePadHandle {
  /** Lê a assinatura atual (desenho ou nome digitado) como PNG — null se estiver vazia. */
  getSignature(): { dataUrl: string; method: "DRAWN" | "TYPED" } | null;
}

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 160;

export const SignaturePad = forwardRef<SignaturePadHandle>(function SignaturePad(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [mode, setMode] = useState<"DRAWN" | "TYPED">("DRAWN");
  const [typedName, setTypedName] = useState("");
  const [hasDrawing, setHasDrawing] = useState(false);

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  }

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (mode !== "DRAWN") return;
    drawingRef.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    const { x, y } = pointerPos(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (mode !== "DRAWN" || !drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawing(true);
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function renderTypedName(name: string) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const trimmed = name.trim();
    if (!trimmed) return;

    const maxWidth = canvas.width - 32;
    let fontSize = 42;
    ctx.font = `italic ${fontSize}px 'Segoe Script', 'Brush Script MT', cursive`;
    while (fontSize > 16 && ctx.measureText(trimmed).width > maxWidth) {
      fontSize -= 2;
      ctx.font = `italic ${fontSize}px 'Segoe Script', 'Brush Script MT', cursive`;
    }

    ctx.fillStyle = "#1a1a1a";
    ctx.textBaseline = "middle";
    ctx.fillText(trimmed, 16, canvas.height / 2);
  }

  useImperativeHandle(ref, () => ({
    getSignature() {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      if (mode === "TYPED") {
        if (!typedName.trim()) return null;
        renderTypedName(typedName);
      } else if (!hasDrawing) {
        return null;
      }
      return { dataUrl: canvas.toDataURL("image/png"), method: mode };
    },
  }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => {
            setMode("DRAWN");
            clear();
          }}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            mode === "DRAWN" ? "bg-teal text-white" : "bg-paper-raised text-ink-muted hover:bg-teal-tint/60"
          }`}
        >
          Desenhar
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("TYPED");
            clear();
          }}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            mode === "TYPED" ? "bg-teal text-white" : "bg-paper-raised text-ink-muted hover:bg-teal-tint/60"
          }`}
        >
          Digitar nome
        </button>
      </div>

      {mode === "TYPED" && (
        <input
          className="input"
          placeholder="Digite seu nome completo"
          value={typedName}
          onChange={(e) => {
            setTypedName(e.target.value);
            renderTypedName(e.target.value);
          }}
        />
      )}

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full touch-none rounded-md border border-line bg-white"
        style={{ height: CANVAS_HEIGHT }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {mode === "DRAWN" && (
        <button type="button" onClick={clear} className="self-start text-xs text-ink-muted hover:text-ink">
          Limpar
        </button>
      )}
    </div>
  );
});
