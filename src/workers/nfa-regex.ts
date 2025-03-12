(async () => {
  const [{ DFA }, { NFA }, { GNFA }, { EPSILON, ALT_EPSILON }] = await Promise.all([
    import("@/finite-automata/dfa"),
    import("@/finite-automata/nfa"),
    import("@/finite-automata/gnfa"),
    import("@/finite-automata/lexer"),
  ]);

  self.onmessage = (e: MessageEvent<{ alphabet: string; start: string; accept: string; nfa: string }>) => {
    const { alphabet, start, accept, nfa } = e.data;

    const M = new Map<string, number>();
    const A = new Set(alphabet.split(","));

    const S = NFA.id;
    M.set(start.trim(), NFA.id++);

    const F = new Set(
      accept
        .split(",")
        .map((s) => s.trim())
        .map((s) => {
          if (!M.has(s)) M.set(s, NFA.id++);
          return M.get(s)!;
        })
    );

    const Q = new Set<number>(F);
    const D = new Map<number, Map<string, Set<number>>>();

    for (const line of nfa.split("\n")) {
      const [q, r, a] = line.split(" ").map((b) => b.trim());
      if (!M.has(q)) M.set(q, NFA.id++);
      if (!M.has(r)) M.set(r, NFA.id++);

      const x = M.get(q)!;
      const y = M.get(r)!;

      Q.add(x);
      Q.add(y);
      if (!D.has(x)) D.set(x, new Map());

      for (const b of a
        .split(",")
        .map((c) => c.trim())
        .map((c) => (c === ALT_EPSILON ? EPSILON : c))) {
        if (!D.get(x)!.has(b)) D.get(x)!.set(b, new Set());
        D.get(x)!.get(b)!.add(y);
      }
    }

    try {
      const n = new NFA(Q, A, S, D, F);
      const d = DFA.fromNFA(n);
      const r = GNFA.fromDFA(d);

      self.postMessage({ success: true, regex: r.toRegularExpression() });
    } catch {
      self.postMessage({ success: false });
    }
  };
})();
