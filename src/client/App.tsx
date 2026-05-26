import { useState } from "react";
import RepoInput from "./components/RepoInput";
import DagGraph from "./components/DagGraph";
import Sidebar from "./components/Sidebar";
import type { DagResult } from "./types";

interface Step {
  id: string;
  label: string;
  status: "pending" | "active" | "done";
}

const STEP_LABELS: Record<string, string> = {
  clone: "Cloning repository",
  parse: "Parsing directory structure",
  analyze: "Analyzing architecture with Claude",
};

export default function App() {
  const [dag, setDag] = useState<DagResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepDetail, setStepDetail] = useState("");
  const [currentRepoUrl, setCurrentRepoUrl] = useState("");

  const handleLoadSaved = (savedDag: DagResult, repoUrl: string) => {
    setDag(savedDag);
    setCurrentRepoUrl(repoUrl);
    setError(null);
    setLoading(false);
  };

  const handleSubmit = async (repoUrl: string) => {
    setLoading(true);
    setError(null);
    setDag(null);
    setCurrentRepoUrl(repoUrl);
    setStepDetail("");
    setSteps([
      { id: "clone", label: STEP_LABELS.clone, status: "pending" },
      { id: "parse", label: STEP_LABELS.parse, status: "pending" },
      { id: "analyze", label: STEP_LABELS.analyze, status: "pending" },
    ]);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const msg = JSON.parse(line.slice(6));

          if (msg.type === "step") {
            const baseId = msg.step.replace(/_done$/, "");
            const isDone = msg.step.endsWith("_done");
            setStepDetail(msg.detail || "");
            setSteps((prev) =>
              prev.map((s) => {
                if (s.id === baseId) {
                  return { ...s, status: isDone ? "done" : "active" };
                }
                return s;
              })
            );
          } else if (msg.type === "result") {
            setDag(msg.data);
          } else if (msg.type === "error") {
            throw new Error(msg.error);
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        currentDag={dag}
        currentRepoUrl={currentRepoUrl}
        onLoad={handleLoadSaved}
      />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <header
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #30363d",
            background: "#161b22",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Repo Visualizer</h1>
          <RepoInput onSubmit={handleSubmit} disabled={loading} />
        </header>

      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            flexDirection: "column",
            gap: 20,
          }}
        >
          <Spinner />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 320 }}>
            {steps.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  opacity: s.status === "pending" ? 0.4 : 1,
                }}
              >
                <StepIcon status={s.status} />
                <span
                  style={{
                    color: s.status === "active" ? "#58a6ff" : s.status === "done" ? "#3fb950" : "#8b949e",
                    fontSize: 14,
                    fontWeight: s.status === "active" ? 600 : 400,
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          {stepDetail && (
            <p style={{ color: "#6e7681", fontSize: 12 }}>{stepDetail}</p>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 24,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#3d1f1f",
              border: "1px solid #f85149",
              borderRadius: 8,
              padding: "12px 20px",
              maxWidth: 600,
            }}
          >
            {error}
          </div>
        </div>
      )}

      {dag && (
        <div style={{ flex: 1, position: "relative" }}>
          <DagGraph data={dag} />
        </div>
      )}

      {!dag && !loading && !error && (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8b949e",
          }}
        >
          <p>Enter a public GitHub repo URL to visualize its architecture.</p>
        </div>
      )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        border: "3px solid #30363d",
        borderTopColor: "#58a6ff",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function StepIcon({ status }: { status: "pending" | "active" | "done" }) {
  if (status === "done") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="8" stroke="#3fb950" strokeWidth="2" />
        <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="#3fb950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "active") {
    return (
      <div
        style={{
          width: 18,
          height: 18,
          border: "2px solid #58a6ff",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8" stroke="#484f58" strokeWidth="2" />
    </svg>
  );
}
