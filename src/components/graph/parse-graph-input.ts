import { ParsedGraph } from "./types";
import { padNode } from "./utils";

export function parseGraphInputEdges(roots: string, input: string, testCaseNumber: number): ParsedGraph {
  const raw = input
    .split("\n")
    .map((s) => {
      const sTrimmed = s.trim().split(/\s+/);
      return sTrimmed;
    })
    .filter((nodes) => nodes[0].length)
    .map(([u, v, ...e]) => [u, v, e.join(" ")]);

  const nodes = new Array<string>();
  const adj = new Map<string, string[]>();
  const edgeToPos = new Map<string, number>();
  const edges = new Array<string>();
  const edgeLabels = new Map<string, string>();

  roots
    .trim()
    .split(/\s+/)
    .map((u) => {
      const pu = padNode(u, testCaseNumber);
      if (u.length && !nodes.includes(pu)) {
        nodes.push(pu);
        adj.set(pu, []);
      }
    });

  for (const e of raw) {
    if (e.length === 1) {
      const pu = padNode(e[0], testCaseNumber);
      if (!nodes.includes(pu)) {
        nodes.push(pu);
        adj.set(pu, []);
      }
    } else if (e.length <= 3) {
      const pu = padNode(e[0], testCaseNumber);
      const pv = padNode(e[1], testCaseNumber);

      if (!nodes.includes(pu)) {
        nodes.push(pu);
        adj.set(pu, [pv]);
      } else if (!adj.get(pu)!.includes(pv)) {
        adj.set(pu, [...adj.get(pu)!, pv]);
      }

      if (!nodes.includes(pv)) {
        nodes.push(pv);
        adj.set(pv, []);
      }

      let edgeBase = "";

      if (pu <= pv) {
        edgeBase = [pu, pv].join(" ");
      } else {
        edgeBase = [pv, pu].join(" ");
      }

      if (edgeToPos.get(edgeBase) === undefined) {
        edgeToPos.set(edgeBase, 0);
      } else {
        edgeToPos.set(edgeBase, edgeToPos.get(edgeBase)! + 1);
      }

      edges.push([pu, pv, edgeToPos.get(edgeBase)].join(" "));
      if (e.length === 3) {
        edgeLabels.set([pu, pv, edgeToPos.get(edgeBase)].join(" "), e[2]);
      }
    } else {
      return {
        status: "BAD",
      };
    }
  }

  return {
    status: "OK",
    graph: {
      nodes,
      adj,
      edges,
      edgeLabels,
    },
  };
}
