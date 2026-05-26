import { useState, useEffect } from "react";
import type { DagResult } from "../types";

interface SavedItem {
  id: string;
  name: string;
  repoUrl: string;
  savedAt: string;
}

interface Props {
  currentDag: DagResult | null;
  currentRepoUrl: string;
  onLoad: (dag: DagResult, repoUrl: string) => void;
}

export default function Sidebar({ currentDag, currentRepoUrl, onLoad }: Props) {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const fetchSaved = async () => {
    const res = await fetch("/api/saved");
    if (res.ok) setItems(await res.json());
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  const handleSave = async () => {
    if (!currentDag || !saveName.trim()) return;
    setSaving(true);
    await fetch("/api/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: saveName.trim(), repoUrl: currentRepoUrl, dag: currentDag }),
    });
    setSaving(false);
    setSaveName("");
    setShowSaveInput(false);
    fetchSaved();
  };

  const handleLoad = async (id: string) => {
    const res = await fetch(`/api/saved/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    onLoad(data.dag, data.repoUrl);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/saved/${id}`, { method: "DELETE" });
    fetchSaved();
  };

  return (
    <div
      style={{
        width: 260,
        background: "#161b22",
        borderRight: "1px solid #30363d",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #30363d",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3" }}>Saved</span>
        {currentDag && !showSaveInput && (
          <button
            onClick={() => setShowSaveInput(true)}
            style={{
              background: "#238636",
              border: "none",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Save
          </button>
        )}
      </div>

      {showSaveInput && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #30363d" }}>
          <input
            autoFocus
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="Name this analysis..."
            style={{
              width: "100%",
              padding: "6px 8px",
              background: "#0d1117",
              border: "1px solid #30363d",
              borderRadius: 4,
              color: "#c9d1d9",
              fontSize: 12,
              outline: "none",
              marginBottom: 6,
            }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleSave}
              disabled={saving || !saveName.trim()}
              style={{
                flex: 1,
                padding: "4px 0",
                background: "#238636",
                border: "none",
                color: "#fff",
                fontSize: 11,
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => { setShowSaveInput(false); setSaveName(""); }}
              style={{
                padding: "4px 8px",
                background: "#21262d",
                border: "none",
                color: "#8b949e",
                fontSize: 11,
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {items.length === 0 && (
          <p style={{ color: "#484f58", fontSize: 12, padding: "8px 16px" }}>
            No saved analyses yet.
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid #21262d",
              cursor: "pointer",
            }}
            onClick={() => handleLoad(item.id)}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1c2128")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "#e6edf3",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {item.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#484f58",
                  fontSize: 14,
                  cursor: "pointer",
                  padding: "0 4px",
                  lineHeight: 1,
                }}
                title="Delete"
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: 10, color: "#484f58", marginTop: 2 }}>
              {new Date(item.savedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
