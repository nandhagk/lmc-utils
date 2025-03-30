(async () => {
  const [{ PDA }, { CFG }, { EPSILON, ALT_EPSILON }, { HashMap, HashSet, DefaultHashMap }] = await Promise.all([
    import("@/pushdown-automata/pda"),
    import("@/pushdown-automata/cfg"),
    import("@/finite-automata/lexer"),
    import("@/lib/hash"),
  ]);

  self.onmessage = (e: MessageEvent<{ start: string; accept: string; pda: string }>) => {
    const { start, accept, pda } = e.data;

    const M = new HashMap<string, number>();
    const A = new HashSet<string>();
    const T = new HashSet<string>();

    const S = PDA.id;
    M.set(start.trim(), PDA.id++);

    const F = new HashSet(
      accept
        .split(",")
        .map((s) => s.trim())
        .map((s) => {
          if (!M.has(s)) M.set(s, PDA.id++);
          return M.get(s)!;
        })
    );

    const Q = new HashSet<number>([...F]);
    const D = new DefaultHashMap(() => new HashSet<[number, string]>());

    for (const line of pda.trim().split("\n")) {
      const [q, r, ...a] = line.split(" ").map((b) => b.trim());
      if (!M.has(q)) M.set(q, PDA.id++);
      if (!M.has(r)) M.set(r, PDA.id++);

      const x = M.get(q)!;
      const y = M.get(r)!;

      Q.add(x);
      Q.add(y);

      const b = a.join(" ").replaceAll(ALT_EPSILON, EPSILON);
      const [u, v] = b.split("->").map((z) => z.trim());
      const [s, t] = u.split(",").map((z) => z.trim());

      if (s !== EPSILON) A.add(s);
      if (t !== EPSILON) T.add(t);
      if (v !== EPSILON) T.add(v);

      D.get([x, s, t]).add([y, v]);
    }

    try {
      // @ts-expect-error idk
      const p = new PDA(Q, A, T, S, D, F);
      const c = CFG.fromPDA(p);

      self.postMessage({ success: true, cfg: c.toString() });
    } catch (error) {
      console.error(error);
      self.postMessage({ success: false });
    }
  };
})();
