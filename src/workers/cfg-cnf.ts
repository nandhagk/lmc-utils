(async () => {
  const [{ formatCFG }, { CNF }] = await Promise.all([import("@/pushdown-automata/utils"), import("@/pushdown-automata/cnf")]);

  self.onmessage = (e: MessageEvent<{ cfg: string }>) => {
    const { cfg } = e.data;

    try {
      const { variables, grammar } = CNF(cfg);
      self.postMessage({ success: true, cnf: formatCFG(variables, grammar) });
    } catch {
      self.postMessage({ success: false });
    }
  };
})();
