import { ParsedGraph } from "./types";
import { padNode } from "./utils";

/* function isConvertibleToNum(s: string): boolean {
  for (const c of s) {
    if (!(c >= "0" && c <= "9")) {
      return false;
    }
  }
  return true;
} */

interface LeetcodeParsed {
  status: "ok" | "bad";
  edges: Array<string[]>;
}

function parseLeetcodeStyle(s: string): LeetcodeParsed {
  if (s.length >= 4 && s[0] === "[" && s[1] === "[") {
    if (s[s.length - 1] === "]" && s[s.length - 2] === "]") {
      return {
        status: "ok",
        edges: s
          .substring(2, s.length - 2)
          .split("],[")
          .map((t) => t.split(",")),
      };
    }
  }
  return {
    status: "bad",
    edges: [],
  };
}

export function parseGraphInputEdges(roots: string, input: string, testCaseNumber: number): ParsedGraph {
  const leetcodes = new Array<string[]>();

  const raw = input
    .split("\n")
    .map((s) => {
      const sTrimmed = s.trim().split(/\s+/);
      const leet = parseLeetcodeStyle(sTrimmed[0]);
      if (sTrimmed.length === 1 && leet.status === "ok") {
        for (const l of leet.edges) {
          leetcodes.push(l);
        }
        return [""];
      }
      return sTrimmed;
    })
    .filter((nodes) => nodes[0].length);

  for (const s of leetcodes) {
    if (s[0].length) {
      raw.push(s);
    }
  }

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
