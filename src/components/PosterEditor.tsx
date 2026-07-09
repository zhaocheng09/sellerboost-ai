import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline, Plus, Minus, Trash2, ArrowUp, ArrowDown,
  Undo2, Redo2, Download, X, Type, Square, Circle as CircleIcon, Minus as LineIcon,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  sourceEl: HTMLElement | null;
  filename?: string;
}

const FONT_FAMILIES = [
  "Playfair Display",
  "Plus Jakarta Sans",
  "Anton",
  "Bebas Neue",
  "Georgia",
  "Inter",
];

export function PosterEditor({ open, onClose, sourceEl, filename = "poster" }: Props) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef<number>(-1);
  const suppressHistoryRef = useRef(false);

  const [selType, setSelType] = useState<string | null>(null);
  const [textProps, setTextProps] = useState<{
    bold: boolean; italic: boolean; underline: boolean;
    fontSize: number; fill: string; fontFamily: string;
  }>({ bold: false, italic: false, underline: false, fontSize: 20, fill: "#000000", fontFamily: "Plus Jakarta Sans" });
  const [hint, setHint] = useState(true);
  const [loading, setLoading] = useState(true);

  // Init canvas + snapshot poster
  useEffect(() => {
    if (!open || !canvasElRef.current || !sourceEl) return;
    let disposed = false;

    const size = Math.min(window.innerWidth - 32, 500);
    const c = new fabric.Canvas(canvasElRef.current, {
      width: size,
      height: size,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
    });
    fabricRef.current = c;

    (async () => {
      setLoading(true);
      try {
        const dataUrl = await toPng(sourceEl, {
          cacheBust: true,
          pixelRatio: 2,
          width: sourceEl.offsetWidth,
          height: sourceEl.offsetHeight,
        });
        if (disposed) return;
        const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: "anonymous" });
        img.set({ selectable: false, evented: false, left: 0, top: 0 });
        const scale = size / (img.width || size);
        img.scale(scale);
        c.backgroundImage = img;
        c.renderAll();
        pushHistory();
      } catch (e) {
        console.error("Poster snapshot failed:", e);
      } finally {
        if (!disposed) setLoading(false);
      }
    })();

    const onSel = () => syncSelection();
    const onModified = () => pushHistory();
    c.on("selection:created", onSel);
    c.on("selection:updated", onSel);
    c.on("selection:cleared", () => { setSelType(null); });
    c.on("object:modified", onModified);
    c.on("object:added", onModified);
    c.on("object:removed", onModified);

    const timer = setTimeout(() => setHint(false), 3000);

    return () => {
      disposed = true;
      clearTimeout(timer);
      c.dispose();
      fabricRef.current = null;
      historyRef.current = [];
      historyIdxRef.current = -1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sourceEl]);

  function pushHistory() {
    if (suppressHistoryRef.current) return;
    const c = fabricRef.current;
    if (!c) return;
    const json = JSON.stringify(c.toJSON(["selectable", "evented"]));
    const h = historyRef.current;
    h.splice(historyIdxRef.current + 1);
    h.push(json);
    historyIdxRef.current = h.length - 1;
  }

  async function loadFromHistory(idx: number) {
    const c = fabricRef.current;
    const json = historyRef.current[idx];
    if (!c || !json) return;
    suppressHistoryRef.current = true;
    const bg = c.backgroundImage;
    await c.loadFromJSON(json);
    if (bg) c.backgroundImage = bg;
    c.renderAll();
    suppressHistoryRef.current = false;
  }

  function undo() {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current -= 1;
      loadFromHistory(historyIdxRef.current);
    }
  }
  function redo() {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyIdxRef.current += 1;
      loadFromHistory(historyIdxRef.current);
    }
  }

  function syncSelection() {
    const c = fabricRef.current;
    const obj = c?.getActiveObject();
    if (!obj) { setSelType(null); return; }
    setSelType(obj.type || null);
    if (obj.type === "i-text" || obj.type === "textbox") {
      const t = obj as fabric.IText;
      setTextProps({
        bold: t.fontWeight === "bold" || t.fontWeight === 700,
        italic: t.fontStyle === "italic",
        underline: !!t.underline,
        fontSize: (t.fontSize as number) || 20,
        fill: (t.fill as string) || "#000000",
        fontFamily: (t.fontFamily as string) || "Plus Jakarta Sans",
      });
    }
  }

  function updateActiveText(patch: Partial<fabric.IText>) {
    const c = fabricRef.current;
    const obj = c?.getActiveObject() as fabric.IText | undefined;
    if (!obj || (obj.type !== "i-text" && obj.type !== "textbox")) return;
    obj.set(patch as object);
    c!.renderAll();
    pushHistory();
    syncSelection();
  }

  function addText() {
    const c = fabricRef.current;
    if (!c) return;
    const t = new fabric.IText("Your text here", {
      left: c.getWidth() / 2 - 80,
      top: c.getHeight() / 2 - 12,
      fontFamily: "Plus Jakarta Sans",
      fontSize: 24,
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 0.5,
      editable: true,
    });
    c.add(t);
    c.setActiveObject(t);
    c.renderAll();
  }

  function addShape(kind: "rect" | "circle" | "line") {
    const c = fabricRef.current;
    if (!c) return;
    const cx = c.getWidth() / 2, cy = c.getHeight() / 2;
    let obj: fabric.FabricObject;
    if (kind === "rect") {
      obj = new fabric.Rect({ left: cx - 60, top: cy - 40, width: 120, height: 80, fill: "rgba(5,150,105,0.85)" });
    } else if (kind === "circle") {
      obj = new fabric.Circle({ left: cx - 50, top: cy - 50, radius: 50, fill: "rgba(220,38,38,0.85)" });
    } else {
      obj = new fabric.Line([cx - 80, cy, cx + 80, cy], { stroke: "#111", strokeWidth: 4 });
    }
    c.add(obj);
    c.setActiveObject(obj);
    c.renderAll();
  }

  function deleteSelected() {
    const c = fabricRef.current;
    const obj = c?.getActiveObject();
    if (!obj || !c) return;
    c.remove(obj);
    c.discardActiveObject();
    c.renderAll();
  }

  function bringForward() {
    const c = fabricRef.current;
    const obj = c?.getActiveObject();
    if (!obj || !c) return;
    c.bringObjectForward(obj);
    c.renderAll();
    pushHistory();
  }
  function sendBackward() {
    const c = fabricRef.current;
    const obj = c?.getActiveObject();
    if (!obj || !c) return;
    c.sendObjectBackwards(obj);
    c.renderAll();
    pushHistory();
  }

  function download() {
    const c = fabricRef.current;
    if (!c) return;
    c.discardActiveObject();
    c.renderAll();
    const dataURL = c.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    const a = document.createElement("a");
    a.download = `SellerAI-${filename}-${Date.now()}.png`;
    a.href = dataURL;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (!open) return null;

  const isText = selType === "i-text" || selType === "textbox";
  const hasSel = !!selType;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-[600px] sm:rounded-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-base">✏️ Edit Your Poster</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="border-b overflow-x-auto">
          <div className="flex items-center gap-1 p-2 min-w-max">
            <ToolBtn onClick={addText} title="Add text"><Type className="h-4 w-4" /></ToolBtn>
            <ToolBtn onClick={() => addShape("rect")} title="Rectangle"><Square className="h-4 w-4" /></ToolBtn>
            <ToolBtn onClick={() => addShape("circle")} title="Circle"><CircleIcon className="h-4 w-4" /></ToolBtn>
            <ToolBtn onClick={() => addShape("line")} title="Line"><LineIcon className="h-4 w-4" /></ToolBtn>
            <Divider />
            {isText && (
              <>
                <ToolBtn active={textProps.bold} onClick={() => updateActiveText({ fontWeight: textProps.bold ? "normal" : "bold" })} title="Bold"><Bold className="h-4 w-4" /></ToolBtn>
                <ToolBtn active={textProps.italic} onClick={() => updateActiveText({ fontStyle: textProps.italic ? "normal" : "italic" })} title="Italic"><Italic className="h-4 w-4" /></ToolBtn>
                <ToolBtn active={textProps.underline} onClick={() => updateActiveText({ underline: !textProps.underline })} title="Underline"><Underline className="h-4 w-4" /></ToolBtn>
                <ToolBtn onClick={() => updateActiveText({ fontSize: Math.max(8, textProps.fontSize - 2) })} title="Smaller"><Minus className="h-4 w-4" /></ToolBtn>
                <span className="text-xs w-6 text-center">{textProps.fontSize}</span>
                <ToolBtn onClick={() => updateActiveText({ fontSize: Math.min(200, textProps.fontSize + 2) })} title="Larger"><Plus className="h-4 w-4" /></ToolBtn>
                <input
                  type="color"
                  value={textProps.fill}
                  onChange={(e) => updateActiveText({ fill: e.target.value })}
                  className="h-8 w-8 rounded border cursor-pointer"
                  title="Text color"
                />
                <select
                  value={textProps.fontFamily}
                  onChange={(e) => updateActiveText({ fontFamily: e.target.value })}
                  className="h-8 text-xs border rounded px-1"
                  title="Font"
                >
                  {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <Divider />
              </>
            )}
            {hasSel && (
              <>
                <ToolBtn onClick={bringForward} title="Bring forward"><ArrowUp className="h-4 w-4" /></ToolBtn>
                <ToolBtn onClick={sendBackward} title="Send backward"><ArrowDown className="h-4 w-4" /></ToolBtn>
                <ToolBtn onClick={deleteSelected} title="Delete"><Trash2 className="h-4 w-4 text-red-600" /></ToolBtn>
                <Divider />
              </>
            )}
            <ToolBtn onClick={undo} title="Undo"><Undo2 className="h-4 w-4" /></ToolBtn>
            <ToolBtn onClick={redo} title="Redo"><Redo2 className="h-4 w-4" /></ToolBtn>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 p-3">
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 text-sm text-gray-600">
                Preparing editor…
              </div>
            )}
            <canvas ref={canvasElRef} className="border rounded shadow" />
          </div>
        </div>

        {hint && (
          <p className="text-center text-xs text-gray-500 px-3 py-1">
            💡 Double-tap text to edit · Drag to move · Corner handles to resize
          </p>
        )}

        {/* Bottom */}
        <div className="p-3 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
          <Button onClick={download} className="flex-[2] bg-[#059669] hover:bg-[#047857] text-white">
            <Download className="h-4 w-4 mr-2" /> Download Edited Poster
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ children, onClick, title, active }: { children: React.ReactNode; onClick: () => void; title: string; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`h-8 w-8 flex items-center justify-center rounded border text-gray-700 ${active ? "bg-emerald-100 border-emerald-500" : "bg-white border-gray-200 hover:bg-gray-100"}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-gray-200 mx-1" />;
}