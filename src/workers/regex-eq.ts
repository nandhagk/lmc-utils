(async () => {
  const [{ DFA }, { NFA }] = await Promise.all([import("@/automaton/dfa"), import("@/automaton/nfa")]);

  self.onmessage = (e: MessageEvent<{ alphabet: string[]; regex1: string; regex2: string }>) => {
    const { alphabet, regex1, regex2 } = e.data;

    const A = new Set(alphabet);

    try {
      const n1 = NFA.fromRegularExpression(A, regex1);
      const n2 = NFA.fromRegularExpression(A, regex2);

      const d1 = DFA.fromNFA(NFA.difference(n1, n2));
      const d2 = DFA.fromNFA(NFA.difference(n2, n1));

      self.postMessage({ success: true, d1, d2 });
    } catch {
      self.postMessage({ success: false });
    }
  };
})();
