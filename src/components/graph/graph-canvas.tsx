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

    const canvasBorderX = canvas.offsetWidth - canvas.clientWidth;
    const canvasBorderY = canvas.offsetHeight - canvas.clientHeight;

    const pixelRatio = window.devicePixelRatio;
    const rect = canvas.getBoundingClientRect();

    const width = pixelRatio * canvas.clientWidth;
    const height = pixelRatio * canvas.clientHeight;

    console.log(canvas.clientWidth, rect.width - canvasBorderX, width, canvas.clientHeight, rect.height - canvasBorderY, height);

    canvas.width = width;
    canvas.height = height;

    ctx.scale(pixelRatio, pixelRatio);
    resizeGraph(canvas.clientWidth, canvas.clientHeight);
    // resizeGraph(canvas.width / 1000, canvas.height / 1000);
  };

  useEffect(() => {
    const font = new FontFace("MonoLisa", 'url("./MonoLisa-Regular.otf")');

    font.load();
    document.fonts.add(font);

    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;

    resizeCanvas();
    animateGraph(canvas, ctx);

    // window.addEventListener("resize", resizeCanvas);
    // return () => void window.removeEventListener("resize", resizeCanvas);
  }, []);

  useEffect(() => updateGraph(testCases), [testCases]);
  useEffect(() => updateDirected(directed), [directed]);
  useEffect(() => updateSettings(settings), [settings]);

  return (
    <div className="xl:h-full flex-1 border-2 border-white rounded-lg">
      <canvas className="xl:h-full w-full" ref={ref}></canvas>
    </div>
  );
}
