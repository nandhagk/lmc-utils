(async () => {
  const [{ HashSet }, { CFG }] = await Promise.all([import("@/lib/hash"), import("@/pushdown-automata/cfg")]);

  self.onmessage = (e: MessageEvent<{ alphabet: string; cfg: string }>) => {
    const { alphabet, cfg } = e.data;

    const A = new HashSet(alphabet.split(",").map((sym) => sym.trim()));
    try {
      const c = CFG.fromCFG(A, cfg).toCNF();

      self.postMessage({ success: true, cnf: c.toString() });
    } catch (error) {
      console.error(error);
      self.postMessage({ success: false });
    }
  };
})();
