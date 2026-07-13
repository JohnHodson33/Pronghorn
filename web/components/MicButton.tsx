"use client";

// Speech-to-text via the browser's Web Speech API (John dictates best).
// Renders nothing when unsupported; Chrome + iOS Safari 17+ work.
// Shared by /improvements and the global "+ Add note" panel.
import { useState } from "react";

function useMic(onText: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const supported = typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  function toggle() {
    if (!supported) return;
    const w = window as any;
    if (listening) { w.__pronghornRec?.stop(); setListening(false); return; }
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    const rec = new Rec();
    w.__pronghornRec = rec;
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).slice(e.resultIndex).map((r: any) => r[0].transcript).join(" ");
      if (t) onText(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    setListening(true);
  }
  return { supported, listening, toggle };
}

export default function MicButton({ onText }: { onText: (t: string) => void }) {
  const { supported, listening, toggle } = useMic(onText);
  if (!supported) return null;
  return (
    <button type="button" onClick={toggle} title={listening ? "Stop dictating" : "Dictate"}
      className={`shrink-0 rounded-md border px-2.5 py-1.5 text-sm ${listening ? "border-red-300 bg-red-50 text-red-600 animate-pulse" : "border-zinc-300 text-zinc-500 hover:bg-zinc-50"}`}>
      {listening ? "⏹" : "🎤"}
    </button>
  );
}
