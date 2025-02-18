(async () => {
  const [{ DFA }, { NFA }, { GNFA }, { EPSILON }] = await Promise.all([
    import("@/automaton/dfa"),
    import("@/automaton/nfa"),
    import("@/automaton/gnfa"),
    import("@/automaton/tokenizer"),
  ]);

  self.onmessage = (e: MessageEvent<{ alphabet: string; start: number; accept: string; nfa: string }>) => {
    const { alphabet, start, accept, nfa } = e.data;

    const A = new Set(alphabet.split(","));
    const S = start;
    const F = new Set(accept.split(",").map((s) => parseInt(s)));

    const Q = new Set<number>(F);
    const D = new Map<number, Map<string, Set<number>>>();

    for (const line of nfa.split("\n")) {
      const [q, r, a] = line.split(" ").filter((a) => a);
      const x = parseInt(q);
      const y = parseInt(r);
      const b = a === "~" ? EPSILON : a;

      Q.add(x);
      Q.add(y);

      if (!D.has(x)) D.set(x, new Map());
      if (!D.get(x)!.has(b)) D.get(x)!.set(b, new Set());
      D.get(x)!.get(b)!.add(y);
    }

    try {
      const n = new NFA(Q, A, S, D, F);

      console.log(n);
      const d = DFA.fromNFA(n);
      const r = GNFA.fromDFA(d);

      self.postMessage({ success: true, regex: r.toRegularExpression() });
    } catch (error) {
      console.error(error);
      self.postMessage({ success: false });
    }
  };
})();
