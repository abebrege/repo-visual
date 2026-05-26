import fs from "fs";
import path from "path";

export interface FileEntry {
  path: string;
  type: "file" | "directory";
  extension?: string;
  children?: FileEntry[];
  size?: number;
}

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "__pycache__",
  ".venv",
  "venv",
  "dist",
  "build",
  ".cache",
  "target",
  "vendor",
  ".idea",
  ".vscode",
]);

const IGNORE_FILES = new Set([
  ".DS_Store",
  "Thumbs.db",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
]);

const MAX_FILES = 2000;
let fileCount = 0;

export function parseDirectory(dirPath: string, basePath: string = dirPath): FileEntry {
  fileCount = 0;
  return parseDir(dirPath, basePath);
}

function parseDir(dirPath: string, basePath: string): FileEntry {
  const relativePath = path.relative(basePath, dirPath) || ".";
  const entry: FileEntry = {
    path: relativePath,
    type: "directory",
    children: [],
  };

  let items: string[];
  try {
    items = fs.readdirSync(dirPath);
  } catch {
    return entry;
  }

  for (const item of items.sort()) {
    if (fileCount >= MAX_FILES) break;
    if (IGNORE_DIRS.has(item) || IGNORE_FILES.has(item)) continue;

    const fullPath = path.join(dirPath, item);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      entry.children!.push(parseDir(fullPath, basePath));
    } else if (stat.isFile()) {
      fileCount++;
      entry.children!.push({
        path: path.relative(basePath, fullPath),
        type: "file",
        extension: path.extname(item).toLowerCase() || undefined,
        size: stat.size,
      });
    }
  }

  return entry;
}

export function flattenTree(entry: FileEntry): string[] {
  const result: string[] = [];
  function walk(e: FileEntry) {
    if (e.type === "file") {
      result.push(e.path);
    }
    if (e.children) {
      for (const child of e.children) {
        walk(child);
      }
    }
  }
  walk(entry);
  return result;
}
