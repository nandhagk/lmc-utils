(async () => {
  const [{ HashSet }, { CFG }, { Generator }] = await Promise.all([
    import("@/lib/hash"),
    import("@/pushdown-automata/cfg"),
    import("@/pushdown-automata/generator"),
  ]);

  self.onmessage = (e: MessageEvent<{ alphabet: string; cfg1: string; cfg2: string }>) => {
    const { alphabet, cfg1, cfg2 } = e.data;

    const A = new HashSet(alphabet.split(",").map((sym) => sym.trim()));
    try {
      const c1 = CFG.fromCFG(A, cfg1).simplifyAggressive();
      const c2 = CFG.fromCFG(A, cfg2).simplifyAggressive();

      const g1 = new Generator(c1);
      const g2 = new Generator(c2);

      for (let i = 0; i < 15; ++i) {
        const w1 = new HashSet(g1.generate(i));
        const w2 = new HashSet(g2.generate(i));

        const d1 = w1.difference(w2);
        const d2 = w2.difference(w1);

        if (d1.size === 0 && d2.size === 0) continue;

        let m1: string | null = null;
        let m2: string | null = null;
        if (d1.size > 0) [m1] = d1;
        if (d2.size > 0) [m2] = d2;

        self.postMessage({ success: true, m1, m2 });
        return;
      }

      self.postMessage({ success: true, m1: null, m2: null });
    } catch (error) {
      console.error(error);
      self.postMessage({ success: false });
    }
  };
})();
