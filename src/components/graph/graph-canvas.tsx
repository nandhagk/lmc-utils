import { useEffect, useRef } from "react";
import { Settings, TestCases } from "./types";

import { animateGraph, updateDirected, updateSettings } from "./animate-graph";

import { resizeGraph, updateGraph } from "./animate-graph";

interface Props {
  testCases: TestCases;
  directed: boolean;
  settings: Settings;
}

export function GraphCanvas({ testCases, directed, settings }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  const resizeCanvasMain = (): void => {
    const canvas = ref.current;

    if (canvas === null) {
      console.log("Error: `canvas` is null!");
      return;
    }

    const ctx = canvas.getContext("2d");

    if (ctx === null) {
      console.log("Error: `ctx` is null!");
      return;
    }

    const canvasBorderX = canvas.offsetWidth - canvas.clientWidth;
    const canvasBorderY = canvas.offsetHeight - canvas.clientHeight;

    const pixelRatio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    const width = pixelRatio * rect.width;
    const height = pixelRatio * rect.height;

    canvas.width = width;
    canvas.height = height;

    ctx.scale(pixelRatio, pixelRatio);

    resizeGraph(rect.width - canvasBorderX, rect.height - canvasBorderY);
  };

  const resizeCanvas = (): void => void resizeCanvasMain();

  useEffect(() => {
    const font = new FontFace("MonoLisa", 'url("./MonoLisa-Regular.otf")');

    font.load();
    document.fonts.add(font);

    const canvas = ref.current;

    if (canvas === null) {
      console.log("Error: canvas is null!");
      return;
    }

    const ctxMain = canvas.getContext("2d");
    if (ctxMain === null) {
      console.log("Error: canvas context is null!");
      return;
    }

    resizeCanvas();

    animateGraph(canvas, ctxMain);

    window.addEventListener("resize", resizeCanvas);
    return () => void window.removeEventListener("resize", resizeCanvas);
  }, []);

  useEffect(() => updateGraph(testCases), [testCases]);
  useEffect(() => updateDirected(directed), [directed]);
  useEffect(() => updateSettings(settings), [settings]);

  return (
    <div className="h-full flex-1 border-2 border-white rounded-lg">
      <canvas className="h-full w-full" ref={ref}></canvas>
    </div>
  );
}
