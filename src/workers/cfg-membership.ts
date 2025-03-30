(async () => {
  const [{ HashSet }, { CFG }, { Recognizer }] = await Promise.all([
    import("@/lib/hash"),
    import("@/pushdown-automata/cfg"),
    import("@/pushdown-automata/recognizer"),
  ]);

  self.onmessage = (e: MessageEvent<{ alphabet: string; test: string; cfg: string }>) => {
    const { alphabet, test, cfg } = e.data;

    const A = new HashSet(alphabet.split(",").map((sym) => sym.trim()));
    try {
      const c = CFG.fromCFG(A, cfg);
      const recognizer = new Recognizer(c);
      self.postMessage({ success: true, isAccepted: recognizer.accepts(test) });
    } catch (error) {
      console.error(error);
      self.postMessage({ success: false });
    }
  };
})();
