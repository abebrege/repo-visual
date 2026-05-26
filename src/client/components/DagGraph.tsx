import { useMemo, useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import type { DagResult } from "../types";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;

function layoutDag(data: DagResult) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });

  const categoryColors = new Map(
    data.categories.map((c) => [c.name, c.color])
  );

  for (const node of data.nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of data.edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  // Map sections for background grouping
  const sectionMap = new Map<string, string>();
  for (const section of data.sections) {
    for (const nid of section.nodeIds) {
      sectionMap.set(nid, section.name);
    }
  }

  const nodes: Node[] = data.nodes.map((n) => {
    const pos = g.node(n.id);
    const color = categoryColors.get(n.category) || "#8b949e";
    return {
      id: n.id,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: {
        label: n.label,
        category: n.category,
        description: n.description,
        files: n.files,
        color,
        section: sectionMap.get(n.id),
      },
      type: "custom",
      style: {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
    };
  });

  const edges: Edge[] = data.edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    label: e.label || "",
    animated: false,
    style: { stroke: "#8b949e", strokeWidth: 1.5 },
    labelStyle: { fill: "#8b949e", fontSize: 10 },
    markerEnd: { type: "arrowclosed" as const, color: "#8b949e" },
  }));

  return { nodes, edges };
}

function CustomNode({ data }: { data: Record<string, unknown> }) {
  const color = data.color as string;
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        background: "#161b22",
        border: `2px solid ${color}`,
        borderRadius: 8,
        padding: "8px 12px",
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#e6edf3",
          marginBottom: 4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {data.label as string}
      </div>
      <div
        style={{
          fontSize: 10,
          color,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {data.category as string}
      </div>
      {typeof data.section === "string" && (
        <div
          style={{
            position: "absolute",
            top: -10,
            right: 8,
            fontSize: 9,
            background: "#30363d",
            color: "#8b949e",
            padding: "1px 6px",
            borderRadius: 4,
          }}
        >
          {data.section}
        </div>
      )}

      {showTooltip && (
        <div
          style={{
            position: "absolute",
            top: NODE_HEIGHT + 8,
            left: 0,
            zIndex: 100,
            background: "#1c2128",
            border: "1px solid #30363d",
            borderRadius: 8,
            padding: 12,
            width: 300,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <p style={{ fontSize: 12, color: "#c9d1d9", marginBottom: 8 }}>
            {data.description as string}
          </p>
          <div style={{ fontSize: 11, color: "#8b949e", maxHeight: 120, overflow: "auto" }}>
            <strong>Files:</strong>
            <ul style={{ paddingLeft: 16, marginTop: 4 }}>
              {(data.files as string[]).slice(0, 15).map((f) => (
                <li key={f} style={{ marginBottom: 2 }}>{f}</li>
              ))}
              {(data.files as string[]).length > 15 && (
                <li>...and {(data.files as string[]).length - 15} more</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

export default function DagGraph({ data }: { data: DagResult }) {
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => layoutDag(data),
    [data]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  const minimapNodeColor = useCallback(
    (node: Node) => (node.data?.color as string) || "#8b949e",
    []
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        style={{ background: "#0d1117" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#21262d" gap={20} />
        <Controls
          style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8 }}
        />
        <MiniMap
          nodeColor={minimapNodeColor}
          style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8 }}
        />

        {/* Legend panel */}
        <Panel position="top-right">
          <div
            style={{
              background: "#161b22",
              border: "1px solid #30363d",
              borderRadius: 8,
              padding: 12,
              minWidth: 160,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 8,
                color: "#e6edf3",
              }}
            >
              Categories
            </div>
            {data.categories.map((cat) => (
              <div
                key={cat.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                  fontSize: 11,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: cat.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "#c9d1d9" }}>{cat.name}</span>
              </div>
            ))}

            {data.sections.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    marginTop: 12,
                    marginBottom: 8,
                    color: "#e6edf3",
                  }}
                >
                  Sections
                </div>
                {data.sections.map((sec) => (
                  <div
                    key={sec.name}
                    style={{ fontSize: 11, color: "#8b949e", marginBottom: 2 }}
                  >
                    {sec.name} ({sec.nodeIds.length})
                  </div>
                ))}
              </>
            )}
          </div>
        </Panel>

        {/* Summary panel */}
        <Panel position="bottom-left">
          <div
            style={{
              background: "#161b22",
              border: "1px solid #30363d",
              borderRadius: 8,
              padding: 12,
              maxWidth: 400,
              fontSize: 12,
              color: "#8b949e",
              lineHeight: 1.5,
            }}
          >
            {data.summary}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
