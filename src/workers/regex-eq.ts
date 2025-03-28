(async () => {
  const [{ DFA }, { NFA }, { HashSet }] = await Promise.all([import("@/finite-automata/dfa"), import("@/finite-automata/nfa"), import("@/lib/hash")]);

  self.onmessage = (e: MessageEvent<{ alphabet: string; regex1: string; regex2: string }>) => {
    const { alphabet, regex1, regex2 } = e.data;

    const A = new HashSet(alphabet.split(","));

    try {
      const n1 = NFA.fromRegularExpression(A, regex1);
      const n2 = NFA.fromRegularExpression(A, regex2);

      const d1 = DFA.fromNFA(NFA.difference(n1, n2));
      const d2 = DFA.fromNFA(NFA.difference(n2, n1));

      const m1 = d1.findMatch();
      const m2 = d2.findMatch();
      self.postMessage({ success: true, m1, m2 });
    } catch (error) {
      console.error(error);
      self.postMessage({ success: false });
    }
  };
})();
