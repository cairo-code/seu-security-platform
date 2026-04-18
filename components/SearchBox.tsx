"use client";
import React, { useState, useEffect, useRef } from "react";

function useHotkey(key: string, cb: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.key === key && (e.ctrlKey || e.metaKey)) || (key === "/" && e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        e.preventDefault(); cb();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, cb]);
}

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // hotkey to open search
  useHotkey("/", () => setOpen(true));
  useHotkey("k", () => { if (window.event?.metaKey) setOpen(true); });

  // Focus input automatically
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open || !query.trim()) { setResults([]); return; }
    setLoading(true); let alive = true;
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(data => { if (alive) setResults(data.results || []); })
        .finally(() => { if (alive) setLoading(false); });
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [query, open]);

  // Keyboard Esc to close
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Group results by type
  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r); return acc;
  }, {} as Record<string, any[]>);

  return (
    <>
      {/* Simple button for nav/topbar, can style as needed */}
      <button onClick={() => setOpen(true)} style={{padding: 6}}>🔍 Search</button>
      {open && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          zIndex: 9999, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center"
        }}
          onClick={() => setOpen(false)}
        >
          <div style={{ width: 440, background: "#161b22", borderRadius: 10, boxShadow: "0 2px 18px #000a",
             padding: 18, color: "#e6edf3", maxHeight: 500, overflowY: "auto" }} onClick={e=>e.stopPropagation()}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type to search..."
              style={{ width: "100%", padding: 8, fontSize: 16, background: "#1c2128", color: "#e6edf3", border: "none", borderRadius: 6, marginBottom: 10 }}
            />
            {loading && <div style={{fontSize:12}}>Searching...</div>}
            {!loading && Object.keys(grouped).length === 0 && query && (
              <div style={{ color: "#aaa", marginTop: 10 }}>No results.</div>
            )}
            {Object.entries(grouped).map(([type, arr]) => (
              <div key={type} style={{marginTop:10}}>
                <div style={{fontSize:13, color:"#58a6ff", marginBottom:3, textTransform:'capitalize'}}>{type}s</div>
                {arr.map((r, i) => (
                  <a key={r.id} href={r.route} style={{display:'block',padding:'7px 0',color:'#e6edf3',borderBottom:'1px solid #23272e',textDecoration:'none'}}>
                    <b>{r.title||r.name}</b>
                    {r.universityId ? <span style={{marginLeft:6,fontSize:12,color:'#aaa'}}>({r.universityId})</span> : null}
                    {r.desc? <div style={{fontSize:11,marginTop:2,color:'#aaa'}}>{r.desc}</div>:null}
                  </a>
                ))}
              </div>
            ))}
            <div style={{fontSize:11, color:'#444', marginTop:16}}>Shortcut: <code>/</code> or <code>Cmd+K</code>, Esc to close.</div>
          </div>
        </div>
      )}
    </>
  );
}
