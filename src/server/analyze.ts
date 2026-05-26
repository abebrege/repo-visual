import Anthropic from "@anthropic-ai/sdk";

export interface DagNode {
  id: string;
  label: string;
  category: string;
  description: string;
  files: string[];
}

export interface DagEdge {
  source: string;
  target: string;
  label?: string;
}

export interface DagCategory {
  name: string;
  color: string;
  description: string;
}

export interface DagSection {
  name: string;
  nodeIds: string[];
}

export interface DagResult {
  nodes: DagNode[];
  edges: DagEdge[];
  categories: DagCategory[];
  sections: DagSection[];
  summary: string;
}

const SYSTEM_PROMPT = `You are a software architecture analyst. Given a repository's file listing, you must analyze it and return a JSON DAG (directed acyclic graph) structure that represents the major architectural components and their relationships.

Your analysis should:
1. Group files into logical architectural components (nodes). Each node represents a module, subsystem, or layer.
2. Identify directional dependency edges between nodes (from depender to dependency).
3. Categorize each node by its architectural role. Use categories like:
   - "frontend" - user-facing code, UI, templates, views
   - "backend" - server logic, API handlers, core processing
   - "data" - database, models, schemas, migrations
   - "infrastructure" - build tools, CI/CD, deployment, config
   - "testing" - test suites, test utilities
   - "library" - reusable library modules exposed to users
   - "internal" - internal processing, algorithms, optimization
   - "api" - public API surface, route definitions, endpoints
   - "docs" - documentation
   Or create your own categories if these don't fit.
4. Group nodes into sections (visual clusters) that represent major areas of concern.
5. Choose distinct, visually pleasant hex colors for each category.
6. The graph should be a DAG or set of DAGs. Avoid cycles.

Return ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "nodes": [{ "id": "string", "label": "string", "category": "string", "description": "string", "files": ["string"] }],
  "edges": [{ "source": "string", "target": "string", "label": "string" }],
  "categories": [{ "name": "string", "color": "#hexcolor", "description": "string" }],
  "sections": [{ "name": "string", "nodeIds": ["string"] }],
  "summary": "A one-paragraph summary of the architecture"
}`;

export async function analyzeWithClaude(
  fileListing: string[],
  repoUrl: string
): Promise<DagResult> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error("CLAUDE_API_KEY not set in .env");
  }

  const client = new Anthropic({ apiKey });

  const userPrompt = `Analyze this repository: ${repoUrl}

Here is the complete file listing (${fileListing.length} files):

${fileListing.join("\n")}

Return the JSON DAG structure representing the architecture of this project.`;

  console.log(`[analyze] Sending ${fileListing.length} files to Claude (model: claude-opus-4-6)...`);
  console.log(`[analyze] Prompt length: ${userPrompt.length} chars`);
  const startTime = Date.now();

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 16384,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[analyze] Claude responded in ${elapsed}s`);
  console.log(`[analyze] Stop reason: ${response.stop_reason}`);
  console.log(`[analyze] Usage: input=${response.usage.input_tokens} output=${response.usage.output_tokens} tokens`);

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    console.error("[analyze] No text block found in response. Content types:", response.content.map(b => b.type));
    throw new Error("No text response from Claude");
  }

  console.log(`[analyze] Response text length: ${textBlock.text.length} chars`);
  console.log(`[analyze] First 200 chars: ${textBlock.text.slice(0, 200)}`);

  // Extract JSON from response, handling possible markdown wrapping
  let jsonStr = textBlock.text.trim();
  // Strip opening ```json if present (handles both complete and truncated responses)
  const openFence = jsonStr.match(/^```(?:json)?\s*/);
  if (openFence) {
    jsonStr = jsonStr.slice(openFence[0].length);
    // Strip closing fence if present
    jsonStr = jsonStr.replace(/\s*```\s*$/, "");
    console.log("[analyze] Stripped markdown code block wrapper");
  }

  // If response was truncated, try to repair the JSON
  if (response.stop_reason === "max_tokens") {
    console.warn("[analyze] Response was truncated (max_tokens). Attempting JSON repair...");
    // Close any open strings, arrays, and objects
    // Remove trailing incomplete key-value or array element
    jsonStr = jsonStr.replace(/,\s*"[^"]*$/, "");
    jsonStr = jsonStr.replace(/,\s*$/, "");
    // Count open/close braces and brackets to balance
    let openBraces = 0, openBrackets = 0;
    for (const ch of jsonStr) {
      if (ch === "{") openBraces++;
      else if (ch === "}") openBraces--;
      else if (ch === "[") openBrackets++;
      else if (ch === "]") openBrackets--;
    }
    jsonStr += "]".repeat(Math.max(0, openBrackets));
    jsonStr += "}".repeat(Math.max(0, openBraces));
    console.log(`[analyze] Repaired JSON: added ${Math.max(0, openBrackets)} ] and ${Math.max(0, openBraces)} }`);
  }

  let parsed: DagResult;
  try {
    parsed = JSON.parse(jsonStr) as DagResult;
  } catch (e) {
    console.error("[analyze] JSON parse failed. Raw text:", jsonStr.slice(0, 500));
    throw e;
  }

  console.log(`[analyze] Parsed DAG: ${parsed.nodes.length} nodes, ${parsed.edges.length} edges, ${parsed.categories.length} categories`);
  return parsed;
}
