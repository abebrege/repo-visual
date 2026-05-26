import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { cloneRepo, cleanupRepo } from "./clone.js";
import { parseDirectory, flattenTree } from "./parse.js";
import { analyzeWithClaude } from "./analyze.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const SAVED_DIR = path.resolve("saved");
if (!fs.existsSync(SAVED_DIR)) {
  fs.mkdirSync(SAVED_DIR, { recursive: true });
}

const GITHUB_URL_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/;

app.post("/api/analyze", async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl || typeof repoUrl !== "string") {
    res.status(400).json({ error: "repoUrl is required" });
    return;
  }

  if (!GITHUB_URL_RE.test(repoUrl)) {
    res.status(400).json({ error: "Invalid GitHub repository URL" });
    return;
  }

  // Set up SSE
  res.setHeaders(new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  }));
  res.flushHeaders();

  const sendStep = (step: string, detail?: string) => {
    res.write(`data: ${JSON.stringify({ type: "step", step, detail })}\n\n`);
  };

  let repoPath: string | null = null;

  try {
    console.log(`[route] Starting analysis for ${repoUrl}`);
    sendStep("clone", `Cloning ${repoUrl}...`);
    repoPath = await cloneRepo(repoUrl);
    console.log(`[route] Clone complete: ${repoPath}`);
    sendStep("clone_done", "Repository cloned successfully");

    sendStep("parse", "Parsing directory structure...");
    const tree = parseDirectory(repoPath);
    const fileListing = flattenTree(tree);
    console.log(`[route] Parse complete: ${fileListing.length} files`);
    sendStep("parse_done", `Found ${fileListing.length} files`);

    sendStep("analyze", "Sending to Claude for architectural analysis...");
    console.log("[route] Calling analyzeWithClaude...");
    const dag = await analyzeWithClaude(fileListing, repoUrl);
    console.log("[route] analyzeWithClaude returned successfully");
    sendStep("analyze_done", `Analysis complete: ${dag.nodes.length} nodes, ${dag.edges.length} edges`);

    console.log("[route] Writing result to SSE stream...");
    res.write(`data: ${JSON.stringify({ type: "result", data: dag })}\n\n`);
    console.log("[route] Done, ending response");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error:", message);
    res.write(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`);
  } finally {
    if (repoPath) {
      cleanupRepo(repoPath);
    }
    res.end();
  }
});

const PORT = Number(process.env.PORT) || 3001;

// --- Saved analyses CRUD ---

app.get("/api/saved", (_req, res) => {
  const files = fs.readdirSync(SAVED_DIR).filter((f) => f.endsWith(".json"));
  const items = files.map((f) => {
    const raw = fs.readFileSync(path.join(SAVED_DIR, f), "utf-8");
    const data = JSON.parse(raw);
    return {
      id: f.replace(/\.json$/, ""),
      name: data.name as string,
      repoUrl: data.repoUrl as string,
      savedAt: data.savedAt as string,
    };
  });
  items.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  res.json(items);
});

app.post("/api/saved", (req, res) => {
  const { name, repoUrl, dag } = req.body;
  if (!name || !dag) {
    res.status(400).json({ error: "name and dag are required" });
    return;
  }
  const id = `${Date.now()}-${name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40)}`;
  const payload = { name, repoUrl, dag, savedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(SAVED_DIR, `${id}.json`), JSON.stringify(payload, null, 2));
  res.json({ id, name, repoUrl, savedAt: payload.savedAt });
});

app.get("/api/saved/:id", (req, res) => {
  const filePath = path.join(SAVED_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  res.json(JSON.parse(raw));
});

app.delete("/api/saved/:id", (req, res) => {
  const filePath = path.join(SAVED_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  fs.unlinkSync(filePath);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
