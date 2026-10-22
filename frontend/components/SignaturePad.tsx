"use client";

import { useRef, useState } from "react";

// Kanvas untuk menggambar tanda tangan dengan mouse / jari / stylus. Hasilnya PNG transparan yang sudah dipotong rapat.
const WIDTH = 1120;
const HEIGHT = 400;
const INK = "#111c4e";

export default function SignaturePad({ onSave, disabled }: { onSave: (file: File) => void; disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);
  const [hint, setHint] = useState<string | null>(null);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) * canvas.width) / rect.width, y: ((e.clientY - rect.top) * canvas.height) / rect.height };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    setHint(null);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = point(e);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setEmpty(false);
  }

  function end() {
    drawing.current = false;
    last.current = null;
  }

  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    setHint(null);
  }

  function save() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Potong ke area bertinta + sedikit ruang, supaya tanda tangan terisi penuh saat dicetak.
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) {
      setHint("Gambar tanda tangan terlebih dahulu.");
      return;
    }
    const pad = 12;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);

    const out = document.createElement("canvas");
    out.width = maxX - minX + 1;
    out.height = maxY - minY + 1;
    out.getContext("2d")!.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    out.toBlob((blob) => {
      if (!blob) return setHint("Gagal memproses tanda tangan.");
      onSave(new File([blob], "tanda-tangan.png", { type: "image/png" }));
    }, "image/png");
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="w-full max-w-xl h-auto aspect-[14/5] rounded-lg border-2 border-dashed border-slate-300 bg-white touch-none cursor-crosshair"
      />
      <div className="flex items-center gap-2 mt-2">
        <button type="button" onClick={clear} disabled={empty || disabled} className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50">
          Hapus Gambar
        </button>
        <button type="button" onClick={save} disabled={empty || disabled} className="text-xs rounded-lg bg-blue-600 text-white px-3 py-1.5 font-medium hover:bg-blue-700 disabled:opacity-50">
          Gunakan Tanda Tangan Ini
        </button>
        {hint && <span className="text-xs text-red-600">{hint}</span>}
      </div>
      <p className="text-[11px] text-slate-400 mt-1">Gambar dengan mouse, jari, atau stylus di kotak di atas.</p>
    </div>
  );
}
