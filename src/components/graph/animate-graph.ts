import { ColorMap, LayerMap, Settings, TestCases } from "./types";

import { stripNode } from "./utils";

import { drawArrow, drawCircle, drawEdgeLabel, drawLine } from "./drawing-tools";

import { FILL_PALETTE_DARK, FILL_PALETTE_LIGHT } from "./palettes";

interface Vector2D {
  x: number;
  y: number;
}

class Node {
  pos: Vector2D;
  vel: Vector2D = { x: 0, y: 0 };
  markColor: number | undefined;
  selected: boolean;

  constructor(x: number, y: number, selected: boolean = false) {
    this.pos = {
      x,
      y,
    };
    this.selected = selected;
  }

  inBounds(): boolean {
    const x = this.pos.x;
    const y = this.pos.y;
    const xOk = x >= nodeRadius && x + nodeRadius <= canvasWidth;
    const yOk = y >= nodeRadius && y + nodeRadius <= canvasHeight;
    return xOk && yOk;
  }

  resetPos(): void {
    this.pos = {
      x: clamp(this.pos.x, nodeRadius, canvasWidth - nodeRadius),
      y: clamp(this.pos.y, nodeRadius, canvasHeight - nodeRadius),
    };
  }
}

function generateRandomCoords(): Vector2D {
  let x = (Math.random() * canvasWidth) / 2 + canvasWidth / 4;
  let y = (Math.random() * canvasHeight) / 2 + canvasHeight / 4;

  let xFailCnt = 0;
  let yFailCnt = 0;

  while (x <= nodeRadius || x >= canvasWidth - nodeRadius) {
    x = (Math.random() * canvasWidth) / 2 + canvasWidth / 4;
    xFailCnt++;
    if (xFailCnt === 10) {
      break;
    }
  }

  while (y <= nodeRadius || y >= canvasHeight - nodeRadius) {
    y = (Math.random() * canvasHeight) / 2 + canvasHeight / 4;
    yFailCnt++;
    if (yFailCnt === 10) {
      break;
    }
  }

  return { x, y };
}

function isInteger(val: string) {
  return parseInt(val, 10).toString() === val;
}

function clamp(val: number, low: number, high: number) {
  return Math.max(low, Math.min(val, high));
}

function euclidDist(u: Vector2D, v: Vector2D): number {
  return Math.hypot(u.x - v.x, u.y - v.y);
}

const FPS = 120;

const STROKE_COLOR_LIGHT = "hsl(0, 0%, 10%)";
const TEXT_COLOR_LIGHT = "hsl(0, 0%, 10%)";
const EDGE_COLOR_LIGHT = "hsl(0, 0%, 10%)";
const EDGE_LABEL_LIGHT = "hsl(30, 50%, 40%)";

const STROKE_COLOR_DARK = "hsl(0, 0%, 90%)";
const TEXT_COLOR_DARK = "hsl(0, 0%, 90%)";
const EDGE_COLOR_DARK = "hsl(0, 0%, 90%)";
const EDGE_LABEL_DARK = "hsl(30, 70%, 60%)";

const TEXT_Y_OFFSET = 1;

const NODE_FRICTION = 0.05;

const CANVAS_FIELD_DIST = 50;

const FILL_COLORS_LIGHT = ["#dedede", "#dd7878", "#7287ed", "#dfae5d", "#70b05b", "#dc8a68", "#309fc5", "#37c2b9", "#ea76cb", "#a879ef"];

const FILL_COLORS_DARK = ["#232323", "#7d3838", "#42479d", "#7f5e0d", "#40603b", "#8c3a28", "#104f85", "#176249", "#7a366b", "#58398f"];

const FILL_COLORS_LENGTH = 10;

let nodeRadius = 16;
let nodeBorderWidthHalf = 1;

let strokeColor = STROKE_COLOR_LIGHT;
let textColor = TEXT_COLOR_LIGHT;

let edgeColor = EDGE_COLOR_LIGHT;
let edgeLabelColor = EDGE_LABEL_LIGHT;

let fillColors = FILL_COLORS_LIGHT;

let canvasWidth: number;
let canvasHeight: number;

let mousePos: Vector2D = { x: 0, y: 0 };

let oldDirected = false;
let directed = false;

let settings: Settings = {
  markBorder: "double",
  markColor: 1,
  labelOffset: 0,
  darkMode: true,
  nodeRadius: 15,
  fontSize: 15,
  nodeBorderWidthHalf: 15,
  edgeLength: 10,
  edgeLabelSeparation: 10,
};

let lastDeletedNodePos: Vector2D = { x: -1, y: -1 };

let nodes: string[] = [];
const nodesToConceal = new Set<string>();
const nodeMap = new Map<string, Node>();

let nodeDist: number = 40;

let labelOffset = 0;

let draggedNodes: string[] = [];

let edges: string[] = [];
const edgeToPos = new Map<string, number>();
let edgeLabels = new Map<string, string>();

let adj = new Map<string, string[]>();
let adjSet = new Map<string, Set<string>>(); // PERF: used to compute `isEdge`

let colorMap: ColorMap | undefined = undefined;
let layerMap: LayerMap | undefined = undefined;

function updateNodes(graphNodes: string[], selected: string[]): void {
  const deletedNodes: string[] = [];

  for (const u of nodes) {
    if (!graphNodes.includes(u)) {
      deletedNodes.push(u);
    }
  }

  nodes = nodes.filter((u) => !deletedNodes.includes(u));

  for (const u of deletedNodes) {
    lastDeletedNodePos = nodeMap.get(u)!.pos;
    nodeMap.delete(u);
  }

  for (let i = 0; i < graphNodes.length; i++) {
    const u = graphNodes[i];

    if (!nodes.includes(u)) {
      let coords = generateRandomCoords();

      if (lastDeletedNodePos.x !== -1) {
        coords = lastDeletedNodePos;
        lastDeletedNodePos = { x: -1, y: -1 };
      }

      nodes.push(u);

      nodeMap.set(u, new Node(coords.x, coords.y, selected.includes(u)));
    }
  }

  for (const [u, n] of nodeMap.entries()) n.selected = selected.includes(u);
  nodes = graphNodes;
}

function updateEdges(graphEdges: string[]): void {
  edges = graphEdges;
  edgeToPos.clear();
  for (const e of edges) {
    const [u, v, rStr] = e.split(" ");
    const eBase = [u, v].join(" ");
    const rNum = parseInt(rStr);
    if (edgeToPos.get(eBase) === undefined) {
      edgeToPos.set(eBase, rNum);
    } else {
      edgeToPos.set(eBase, Math.max(rNum, edgeToPos.get(eBase)!));
    }
  }
}

function updateVelocities() {
  for (const u of nodes) {
    if (nodesToConceal.has(u)) continue;

    const uPos = nodeMap.get(u)!.pos;

    for (const v of nodes) {
      if (nodesToConceal.has(v)) continue;
      if (v !== u) {
        const vPos = nodeMap.get(v)!.pos;

        const dist = Math.max(euclidDist(uPos, vPos), 10);

        let aMag = 150_000 / (2 * Math.pow(dist, 4.5));

        const isEdge = adjSet.get(u)!.has(v) || adjSet.get(v)!.has(u);

        if (isEdge) {
          aMag = Math.pow(Math.abs(dist - nodeDist), 1.6) / 100_000;
          if (dist >= nodeDist) {
            aMag *= -1;
          }
        }

        const ax = vPos.x - uPos.x;
        const ay = vPos.y - uPos.y;

        const uVel = nodeMap.get(u)!.vel;

        nodeMap.get(u)!.vel = {
          x: clamp((uVel.x - aMag * ax) * (1 - NODE_FRICTION), -100, 100),
          y: clamp((uVel.y - aMag * ay) * (1 - NODE_FRICTION), -100, 100),
        };
      }
    }

    const axSign = canvasWidth / 2 - uPos.x >= 0 ? 1 : -1;
    const aySign = canvasHeight / 2 - uPos.y >= 0 ? 1 : -1;

    let axB = 0;
    let ayB = 0;

    if (Math.min(uPos.x, canvasWidth - uPos.x) <= CANVAS_FIELD_DIST) {
      axB = Math.pow(canvasWidth / 2 - uPos.x, 2) * axSign;
      axB /= 500_000;
    }

    if (Math.min(uPos.y, canvasHeight - uPos.y) <= CANVAS_FIELD_DIST) {
      ayB = Math.pow(canvasHeight / 2 - uPos.y, 2) * aySign;
      ayB /= 500_000;
    }

    nodeMap.get(u)!.vel = {
      x: clamp((nodeMap.get(u)!.vel.x + axB) * (1 - NODE_FRICTION), -100, 100),
      y: clamp((nodeMap.get(u)!.vel.y + ayB) * (1 - NODE_FRICTION), -100, 100),
    };

    if (layerMap !== undefined) {
      nodeMap.get(u)!.vel = {
        x: nodeMap.get(u)!.vel.x,
        y: 0,
      };
      const depth = layerMap.get(u)![0];
      const maxDepth = layerMap.get(u)![1];

      let layerHeight = (nodeDist * 4) / 5;

      if (maxDepth * layerHeight >= canvasHeight - 2 * CANVAS_FIELD_DIST) {
        layerHeight = (canvasHeight - 2 * CANVAS_FIELD_DIST) / maxDepth;
      }

      const yTarget = CANVAS_FIELD_DIST + (depth - 0.5) * layerHeight;
      const y = nodeMap.get(u)!.pos.y;

      let ay = Math.pow(Math.abs(y - yTarget), 1.75) / 100;

      if (y > yTarget) {
        ay *= -1;
      }

      nodeMap.get(u)!.vel = {
        x: nodeMap.get(u)!.vel.x,
        y: clamp((nodeMap.get(u)!.vel.y + ay) * (1 - NODE_FRICTION), -100, 100),
      };
    }

    const uVel = nodeMap.get(u)!.vel;

    nodeMap.get(u)!.pos = {
      x: uPos.x + uVel.x,
      y: uPos.y + uVel.y,
    };
  }
}

function buildSettings(): void {
  if (settings.darkMode) {
    strokeColor = STROKE_COLOR_DARK;
    textColor = TEXT_COLOR_DARK;
    fillColors = FILL_COLORS_DARK;
    edgeColor = EDGE_COLOR_DARK;
    edgeLabelColor = EDGE_LABEL_DARK;
  } else {
    strokeColor = STROKE_COLOR_LIGHT;
    textColor = TEXT_COLOR_LIGHT;
    fillColors = FILL_COLORS_LIGHT;
    edgeColor = EDGE_COLOR_LIGHT;
    edgeLabelColor = EDGE_LABEL_LIGHT;
  }

  nodeRadius = settings.nodeRadius;
  nodeBorderWidthHalf = settings.nodeBorderWidthHalf;
  nodeDist = settings.edgeLength + 2 * nodeRadius;

  labelOffset = settings.labelOffset;

  colorMap = undefined;
  layerMap = undefined;
}

export function updateGraph(testCases: TestCases) {
  nodesToConceal.clear();

  let rawNodes: string[] = [];
  let rawEdges: string[] = [];
  let rawSelected: string[] = [];

  const rawAdj = new Map<string, string[]>();
  const rawEdgeLabels = new Map<string, string>();

  testCases.forEach((testCase) => {
    if (testCase.inputFormat === "edges") {
      testCase.graphParChild.nodes.map((u) => nodesToConceal.add(u));
    } else {
      testCase.graphEdges.nodes.map((u) => nodesToConceal.add(u));
    }

    rawSelected = [...rawSelected, ...testCase.selected];

    rawNodes = [...rawNodes, ...testCase.graphEdges.nodes];
    rawNodes = [...rawNodes, ...testCase.graphParChild.nodes];

    rawEdges = [...rawEdges, ...testCase.graphEdges.edges];
    rawEdges = [...rawEdges, ...testCase.graphParChild.edges];

    testCase.graphEdges.adj.forEach((v, k) => {
      rawAdj.set(k, v);
    });
    testCase.graphParChild.adj.forEach((v, k) => {
      rawAdj.set(k, v);
    });

    testCase.graphEdges.edgeLabels.forEach((v, k) => {
      rawEdgeLabels.set(k, v);
    });
    testCase.graphParChild.edgeLabels.forEach((v, k) => {
      rawEdgeLabels.set(k, v);
    });
  });

  updateNodes(rawNodes, rawSelected);
  updateEdges(rawEdges);

  adj = new Map<string, string[]>(rawAdj);
  adjSet = new Map<string, Set<string>>();

  adj.forEach((vs, u) => {
    adjSet.set(u, new Set<string>(vs));
  });

  edgeLabels = new Map<string, string>(rawEdgeLabels);

  buildSettings();
}

export function resizeGraph(width: number, height: number) {
  canvasWidth = width;
  canvasHeight = height;
}

export function updateDirected(d: boolean) {
  directed = d;
}

export function updateSettings(s: Settings) {
  settings = s;
  buildSettings();
}

function resetMisplacedNodes() {
  nodes.map((u) => {
    if (!nodeMap.get(u)!.inBounds()) {
      nodeMap.get(u)!.resetPos();
    }
  });
}

function renderNodes(ctx: CanvasRenderingContext2D) {
  for (let i = 0; i < nodes.length; i++) {
    const u = nodes[i];

    if (nodesToConceal.has(u)) continue;

    const node = nodeMap.get(u)!;

    ctx.lineWidth = 2 * nodeBorderWidthHalf;
    ctx.lineCap = "round";

    ctx.strokeStyle = strokeColor;

    let isTransparent = colorMap === undefined;

    ctx.fillStyle = fillColors[colorMap === undefined ? 0 : colorMap.get(nodes[i])! % FILL_COLORS_LENGTH];

    if (nodeMap.get(nodes[i])!.markColor !== undefined) {
      isTransparent = false;
      const idx = nodeMap.get(nodes[i])!.markColor!;
      const color = settings.darkMode ? FILL_PALETTE_DARK[idx] : FILL_PALETTE_LIGHT[idx];
      ctx.fillStyle = color;
    }

    drawCircle(ctx, node.pos, node.selected, nodeBorderWidthHalf, nodeRadius, isTransparent);

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const s = stripNode(u);

    ctx.font = `${settings.fontSize + 2}px MonoLisa`;
    ctx.fillStyle = textColor;
    ctx.fillText(isInteger(s) ? (parseInt(s, 10) + labelOffset).toString() : s, node!.pos.x, node!.pos.y + TEXT_Y_OFFSET);
  }
}

function renderEdges(ctx: CanvasRenderingContext2D) {
  const renderedEdges = [...edges];

  for (const e of renderedEdges) {
    if (nodesToConceal.has(e.split(" ")[0])) continue;

    let pt1 = nodeMap.get(e.split(" ")[0])!.pos;
    let pt2 = nodeMap.get(e.split(" ")[1])!.pos;
    let toReverse = false;

    if (e.split(" ")[0] > e.split(" ")[1]) {
      [pt1, pt2] = [pt2, pt1];
      toReverse = true;
    }

    const edr = parseInt(e.split(" ")[2]);
    const eRev = e.split(" ")[1] + " " + e.split(" ")[0];

    ctx.strokeStyle = strokeColor;

    const thickness = nodeBorderWidthHalf;

    drawLine(ctx, pt1, pt2, edr, thickness, edgeColor);

    ctx.setLineDash([]);

    if (directed) {
      drawArrow(ctx, pt1, pt2, edr, toReverse, thickness, nodeRadius, edgeColor);
    }

    const labelReverse = false;

    if (edgeLabels.has(e)) {
      if (!edgeLabels.has(eRev)) {
        drawEdgeLabel(ctx, pt1, pt2, edr, edgeLabels.get(e)!, labelReverse, settings, nodeBorderWidthHalf, edgeLabelColor);
      } else {
        if (e < eRev) {
          drawEdgeLabel(ctx, pt1, pt2, edr, edgeLabels.get(e)!, labelReverse, settings, nodeBorderWidthHalf, edgeLabelColor);
        } else {
          drawEdgeLabel(ctx, pt1, pt2, edr, edgeLabels.get(e)!, labelReverse, settings, nodeBorderWidthHalf, edgeLabelColor);
        }
      }
    }
  }
}

export function animateGraph(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  generateRandomCoords();

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();

    mousePos = {
      x: event.offsetX,
      y: event.offsetY,
    };

    nodes.map((u) => {
      if (euclidDist(nodeMap.get(u)!.pos, mousePos) <= nodeRadius) {
        draggedNodes.push(u);
      }
    });

    if (draggedNodes.length) {
      draggedNodes = [draggedNodes[draggedNodes.length - 1]];
      canvas.style.cursor = "pointer";
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    event.preventDefault();

    mousePos = {
      x: event.offsetX,
      y: event.offsetY,
    };

    if (draggedNodes.length === 0) {
      let hasNode = false;
      nodes.map((u) => {
        if (euclidDist(nodeMap.get(u)!.pos, mousePos) <= nodeRadius) {
          hasNode = true;
        }
      });
      if (hasNode) {
        canvas.style.cursor = "pointer";
      } else {
        canvas.style.cursor = "default";
      }
    }
  });

  canvas.addEventListener("pointerup", (event) => {
    event.preventDefault();
    draggedNodes = [];
    canvas.style.cursor = "default";
  });

  canvas.addEventListener("pointerleave", (event) => {
    event.preventDefault();
    draggedNodes = [];
    canvas.style.cursor = "default";
  });

  const animate = () => {
    setTimeout(() => {
      requestAnimationFrame(animate);

      ctx.clearRect(0, 0, canvasWidth + 20, canvasHeight + 20);

      resetMisplacedNodes();

      if (directed !== oldDirected) {
        buildSettings();
        oldDirected = directed;
      }

      draggedNodes.map((u) => {
        nodeMap.get(u)!.pos = {
          x: clamp(mousePos.x, nodeRadius, canvasWidth - nodeRadius),
          y: clamp(mousePos.y, nodeRadius, canvasHeight - nodeRadius),
        };
      });

      renderEdges(ctx);
      renderNodes(ctx);

      updateVelocities();
    }, 1000 / FPS);
  };
  animate();
}
