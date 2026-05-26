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
