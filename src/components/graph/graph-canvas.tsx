import { useEffect, useRef } from "react";

import { animateGraph, updateDirected, updateSettings } from "./animate-graph";

import { resizeGraph, updateGraph } from "./animate-graph";
import { parseGraphInputEdges } from "./parse-graph-input";
import { getDefaultGraph } from "./utils";

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
    const font = new FontFace("MonoLisa", 'url("./MonoLisa-Regular.otf")');

    font.load();
    document.fonts.add(font);

    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;

    resizeCanvas();

    updateDirected(true);
    updateSettings({
      language: "en",
      drawMode: "node",
      expandedCanvas: false,
      markBorder: "double",
      markColor: 1,
      labelOffset: 0,
      darkMode: true,
      nodeRadius: 25,
      fontSize: 20,
      nodeBorderWidthHalf: 1,
      edgeLength: 100,
      edgeLabelSeparation: 20,
      showComponents: false,
      showBridges: false,
      showMSTs: false,
      treeMode: false,
      bipartiteMode: false,
      lockMode: false,
      markedNodes: false,
      fixedMode: true,
      multiedgeMode: true,
      settingsFormat: "general",
    });
    animateGraph(canvas, ctx);
  }, []);

  useEffect(
    () =>
      updateGraph(
        new Map([
          [
            0,
            {
              graphEdges: parseGraphInputEdges("", graph, 0).graph!,
              selected,
              graphParChild: getDefaultGraph(),
              inputFormat: "edges",
            },
          ],
        ])
      ),
    [selected, graph]
  );

  return (
    <div className="min-w-[300px] h-96 md:h-full flex-1 border-2 border-white rounded-lg">
      <canvas className="md:h-full h-96 w-full" ref={ref}></canvas>
    </div>
  );
}
