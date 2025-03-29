(async () => {
  const [{ HashSet }, { CFG }, { Parser }] = await Promise.all([
    import("@/lib/hash"),
    import("@/pushdown-automata/cfg"),
    import("@/pushdown-automata/parser"),
  ]);

  self.onmessage = (e: MessageEvent<{ alphabet: string; test: string; cfg: string }>) => {
    const { alphabet, test, cfg } = e.data;

    const A = new HashSet(alphabet.split(",").map((sym) => sym.trim()));
    try {
      const c = CFG.fromCFG(A, cfg);
      c.simplify();

      const parser = new Parser(c);
      self.postMessage({ success: true, isAccepted: parser.accepts(test) });
    } catch (error) {
      console.error(error);
      self.postMessage({ success: false });
    }
  };
})();
