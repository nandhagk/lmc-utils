import { useEffect, useRef } from "react";

import { animateGraph, resizeGraph, updateDirected, updateGraph, updateSettings } from "./animate-graph";
import { parseGraphInputEdges } from "./parse-graph-input";

interface Props {
  graph: string;
  selected: string[];
}

export function GraphCanvas({ graph, selected }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  const resizeCanvas = () => {
    const canvas = ref.current;
    if (canvas === null) return;

    const pixelRatio = window.devicePixelRatio;

    canvas.width = pixelRatio * canvas.clientWidth;
    canvas.height = pixelRatio * canvas.clientHeight;

    canvas.getContext("2d")?.scale(pixelRatio, pixelRatio);
    resizeGraph(canvas.width / pixelRatio, canvas.height / pixelRatio);
  };

  useEffect(() => {
    const canvas = ref.current;
    if (canvas === null) return;

    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [ref]);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;

    resizeCanvas();

    updateDirected(true);
    updateSettings({
      markBorder: "double",
      markColor: 1,
      labelOffset: 0,
      darkMode: true,
      nodeRadius: 25,
      fontSize: 20,
      nodeBorderWidthHalf: 1,
      edgeLength: 120,
      edgeLabelSeparation: 20,
    });
    animateGraph(canvas, ctx);
  }, []);

  useEffect(() => updateGraph(new Map([[0, { graphEdges: parseGraphInputEdges("", graph, 0).graph!, selected }]])), [selected, graph]);

  return (
    <div className="min-w-[300px] h-96 md:h-full flex-1 border-2 border-white rounded-lg">
      <canvas className="md:h-full h-96 w-full" ref={ref}></canvas>
    </div>
  );
}
