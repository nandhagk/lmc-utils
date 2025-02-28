import { Settings } from "./types";

const SELECTED_SCALE = 1.25;

interface Vector2D {
  x: number;
  y: number;
}

function euclidDist(u: Vector2D, v: Vector2D): number {
  return Math.hypot(u.x - v.x, u.y - v.y);
}

export function drawLine(ctx: CanvasRenderingContext2D, u: Vector2D, v: Vector2D, r: number, nodeBorderWidthHalf: number, edgeColor: string) {
  ctx.lineWidth = 2 * nodeBorderWidthHalf;
  ctx.strokeStyle = edgeColor;

  ctx.beginPath();

  if (u.x == v.x && u.y === v.y) {
    ctx.arc(u.x, u.y - 20, 20, 0, 2 * Math.PI);
  } else {
    let px = u.y - v.y;
    let py = v.x - u.x;

    const toFlip = r % 2 == 0;

    px *= 0.5 * (toFlip ? -1 : 1) * Math.floor((r + 1) / 2);
    py *= 0.5 * (toFlip ? -1 : 1) * Math.floor((r + 1) / 2);

    ctx.beginPath();
    ctx.moveTo(u.x, u.y);
    ctx.bezierCurveTo(u.x + px, u.y + py, v.x + px, v.y + py, v.x, v.y);
  }

  ctx.stroke();
}

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  u: Vector2D,
  v: Vector2D,
  r: number,
  toReverse: boolean,
  nodeBorderWidthHalf: number,
  nodeRadius: number,
  edgeColor: string
) {
  const theta = Math.atan2(v.y - u.y, v.x - u.x);

  let px = u.y - v.y;
  let py = v.x - u.x;

  const toFlip = r % 2 == 0;

  px *= 0.375 * (toFlip ? -1 : 1) * Math.floor((r + 1) / 2);
  py *= 0.375 * (toFlip ? -1 : 1) * Math.floor((r + 1) / 2);

  ctx.lineWidth = 1.5 * nodeBorderWidthHalf;

  ctx.strokeStyle = edgeColor;
  ctx.fillStyle = edgeColor;

  const mx = u.x === v.x && u.y === v.y ? u.x : (u.x + v.x) / 2 + px;
  const my = u.x === v.x && u.y === v.y ? u.y - 40 : (u.y + v.y) / 2 + py;

  ctx.beginPath();

  const mult = toReverse ? -1 : 1;

  ctx.moveTo(mx, my);
  ctx.lineTo(mx - mult * (nodeRadius / 2) * Math.cos(theta - Math.PI / 6), my - mult * (nodeRadius / 2) * Math.sin(theta - Math.PI / 6));
  ctx.lineTo(mx - mult * (nodeRadius / 2) * Math.cos(theta + Math.PI / 6), my - mult * (nodeRadius / 2) * Math.sin(theta + Math.PI / 6));
  ctx.lineTo(mx, my);

  ctx.fill();
  ctx.stroke();
}

export function drawEdgeLabel(
  ctx: CanvasRenderingContext2D,
  u: Vector2D,
  v: Vector2D,
  r: number,
  label: string,
  toReverse: boolean,
  settings: Settings,
  nodeBorderWidthHalf: number,
  edgeLabelColor: string
) {
  let px = u.y - v.y;
  let py = v.x - u.x;

  const toFlip = r % 2 == 0;
  const bx = px / euclidDist(u, v),
    by = py / euclidDist(u, v);

  px *= 0.37 * (toFlip ? -1 : 1) * Math.floor((r + 1) / 2);
  py *= 0.37 * (toFlip ? -1 : 1) * Math.floor((r + 1) / 2);

  const mult = toReverse ? -1 : 1;

  px += mult * settings.edgeLabelSeparation * bx;
  py += mult * settings.edgeLabelSeparation * by;

  const mx = (u.x + v.x) / 2;
  const my = (u.y + v.y) / 2;

  ctx.lineWidth = 2 * nodeBorderWidthHalf;

  ctx.beginPath();

  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  ctx.font = `${settings.fontSize}px MonoLisa`;
  ctx.fillStyle = edgeLabelColor;

  if (u.x === v.x && u.y === v.y) {
    ctx.fillText(label, u.x, u.y - 60);
  } else {
    ctx.fillText(label, mx + px, my + py);
  }
}

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  u: Vector2D,
  sel: boolean,
  nodeBorderWidthHalf: number,
  nodeRadius: number,
  isTransparent: boolean
) {
  ctx.beginPath();

  if (isTransparent) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.arc(u.x, u.y, nodeRadius - nodeBorderWidthHalf, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  ctx.arc(u.x, u.y, nodeRadius - nodeBorderWidthHalf, 0, 2 * Math.PI);

  if (!isTransparent) {
    ctx.fill();
  }

  ctx.stroke();

  if (sel) {
    ctx.beginPath();
    ctx.arc(u.x, u.y, SELECTED_SCALE * (nodeRadius - nodeBorderWidthHalf), 0, 2 * Math.PI);
    ctx.stroke();
  }
}
