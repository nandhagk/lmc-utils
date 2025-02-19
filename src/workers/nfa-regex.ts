(async () => {
  const [{ DFA }, { NFA }, { GNFA }, { EPSILON }] = await Promise.all([
    import("@/automaton/dfa"),
    import("@/automaton/nfa"),
    import("@/automaton/gnfa"),
    import("@/automaton/tokenizer"),
  ]);

  self.onmessage = (e: MessageEvent<{ alphabet: string; start: string; accept: string; nfa: string }>) => {
    const { alphabet, start, accept, nfa } = e.data;

    let id = 0;
    const M = new Map<string, number>();

    const A = new Set(alphabet.split(","));

    const S = id;
    M.set(start.trim(), id++);

    const F = new Set(
      accept
        .split(",")
        .map((s) => s.trim())
        .map((s) => {
          if (!M.has(s)) M.set(s, id++);
          return M.get(s)!;
        })
    );

    const Q = new Set<number>(F);
    const D = new Map<number, Map<string, Set<number>>>();

    for (const line of nfa.split("\n")) {
      const [q, r, a] = line.split(" ").map((b) => b.trim());
      if (!M.has(q)) M.set(q, id++);
      if (!M.has(r)) M.set(r, id++);

      const x = M.get(q)!;
      const y = M.get(r)!;

      Q.add(x);
      Q.add(y);
      if (!D.has(x)) D.set(x, new Map());

      for (const b of a.split(",").map((c) => (c === "~" ? EPSILON : c))) {
        if (!D.get(x)!.has(b)) D.get(x)!.set(b, new Set());
        D.get(x)!.get(b)!.add(y);
      }
    }

    try {
      const n = new NFA(Q, A, S, D, F);

      console.log(n);
      const d = DFA.fromNFA(n);
      const r = GNFA.fromDFA(d);

      self.postMessage({ success: true, regex: r.toRegularExpression() });
    } catch {
      self.postMessage({ success: false });
    }
  };
})();
