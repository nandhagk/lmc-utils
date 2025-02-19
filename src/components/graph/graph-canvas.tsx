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

  const resizeCanvas = (): void => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;

    const pixelRatio = window.devicePixelRatio;

    const width = Math.max(500, pixelRatio * canvas.clientWidth);
    const height = pixelRatio * canvas.clientHeight;

    canvas.width = width;
    canvas.height = height;

    ctx.scale(pixelRatio, pixelRatio);
    resizeGraph(width / pixelRatio, height / pixelRatio);
  };

  useEffect(() => {
    const font = new FontFace("MonoLisa", 'url("./MonoLisa-Regular.otf")');

    font.load();
    document.fonts.add(font);

    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;

    resizeCanvas();
    animateGraph(canvas, ctx);
  }, []);

  useEffect(() => updateGraph(testCases), [testCases]);
  useEffect(() => updateDirected(directed), [directed]);
  useEffect(() => updateSettings(settings), [settings]);

  return (
    <div className="min-w-[300px] h-96 md:h-full flex-1 border-2 border-white rounded-lg">
      <canvas className="md:h-full w-full" ref={ref}></canvas>
    </div>
  );
}
