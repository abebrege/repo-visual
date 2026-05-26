import simpleGit from "simple-git";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

const REPOS_DIR = path.resolve("repos");

export async function cloneRepo(repoUrl: string): Promise<string> {
  if (!fs.existsSync(REPOS_DIR)) {
    fs.mkdirSync(REPOS_DIR, { recursive: true });
  }

  const repoId = randomUUID();
  const dest = path.join(REPOS_DIR, repoId);
  const git = simpleGit();

  await git.clone(repoUrl, dest, ["--depth", "1"]);
  return dest;
}

export function cleanupRepo(repoPath: string) {
  fs.rmSync(repoPath, { recursive: true, force: true });
}
