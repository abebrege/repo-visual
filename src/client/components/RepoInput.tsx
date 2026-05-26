import { useState } from "react";

interface Props {
  onSubmit: (url: string) => void;
  disabled: boolean;
}

export default function RepoInput({ onSubmit, disabled }: Props) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onSubmit(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flex: 1, maxWidth: 600 }}>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://github.com/owner/repo"
        disabled={disabled}
        style={{
          flex: 1,
          padding: "8px 12px",
          borderRadius: 6,
          border: "1px solid #30363d",
          background: "#0d1117",
          color: "#c9d1d9",
          fontSize: 14,
          outline: "none",
        }}
      />
      <button
        type="submit"
        disabled={disabled || !url.trim()}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          border: "none",
          background: disabled ? "#21262d" : "#238636",
          color: disabled ? "#484f58" : "#fff",
          fontSize: 14,
          fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        Analyze
      </button>
    </form>
  );
}
