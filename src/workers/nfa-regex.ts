(async () => {
  const [{ DFA }, { NFA }, { GNFA }, { EPSILON, ALT_EPSILON }, { HashMap, HashSet, DefaultHashMap }] = await Promise.all([
    import("@/finite-automata/dfa"),
    import("@/finite-automata/nfa"),
    import("@/finite-automata/gnfa"),
    import("@/finite-automata/lexer"),
    import("@/lib/hash"),
  ]);

  self.onmessage = (e: MessageEvent<{ alphabet: string; start: string; accept: string; nfa: string }>) => {
    const { alphabet, start, accept, nfa } = e.data;

    const M = new HashMap<string, number>();
    const A = new HashSet(alphabet.split(",").map((sym) => sym.trim()));

    const S = NFA.id;
    M.set(start.trim(), NFA.id++);

    const F = new HashSet(
      accept
        .split(",")
        .map((s) => s.trim())
        .map((s) => {
          if (!M.has(s)) M.set(s, NFA.id++);
          return M.get(s)!;
        })
    );

    const Q = new HashSet<number>([...F]);
    const D = new DefaultHashMap(() => new HashSet<number>());

    for (const line of nfa.trim().split("\n")) {
      const [q, r, a] = line.split(" ").map((b) => b.trim());
      if (!M.has(q)) M.set(q, NFA.id++);
      if (!M.has(r)) M.set(r, NFA.id++);

      const x = M.get(q)!;
      const y = M.get(r)!;

      Q.add(x);
      Q.add(y);

      D.get([x, a.replaceAll(ALT_EPSILON, EPSILON).trim()]).add(y);
    }

    try {
      // @ts-expect-error idk
      const n = new NFA(Q, A, S, D, F);

      const d = DFA.fromNFA(n);
      const r = GNFA.fromDFA(d);

      self.postMessage({ success: true, regex: r.toRegularExpression() });
    } catch (error) {
      console.error(error);
      self.postMessage({ success: false });
    }
  };
})();
