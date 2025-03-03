(async () => {
  const [{ EPSILON }] = await Promise.all([import("@/finite-automata/tokenizer")]);

  const hashRule = (rule: string[]) => rule.join(" ");
  const unHashRule = (hash: string) => hash.split(" ");
  const uniqueRules = (rules: string[][]) =>
    [...new Set(rules.map((rule) => hashRule(rule)))].map((hash) => unHashRule(hash)).filter((rule) => rule.length !== 0);

  const isEpsilonRule = (rule: string[]) => rule.length === 1 && rule[0] === EPSILON;

  const parseCFG = (cfg: string) => {
    return new Map(
      cfg
        .split("\n")
        .map((rule) => rule.split("->"))
        .map(
          ([variable, subs]) =>
            [
              variable.trim(),
              subs.split("|").map((sub) =>
                sub
                  .trim()
                  .split(" ")
                  .map((sym) => (sym === "~" ? EPSILON : sym))
              ),
            ] as [string, string[][]]
        )
    );
  };

  self.onmessage = (e: MessageEvent<{ cfg: string }>) => {
    const { cfg } = e.data;

    try {
      const grammar = parseCFG(cfg);
      for (const [variable, rules] of grammar.entries()) grammar.set(variable, uniqueRules(rules));

      if (grammar.size === 0) {
        self.postMessage({ success: true, cnf: "" });
        return;
      }

      const start = "S0";
      const variables = new Set([start, ...grammar.keys()]);

      grammar.set(start, [[grammar.keys().next().value!]]);

      const hasRemovedEpsilonRule = new Set<string>();

      let entry: [string, string[][]] | null = null;
      while ((entry = grammar.entries().find(([variable, rules]) => variable !== start && rules.find((rule) => isEpsilonRule(rule))) ?? null)) {
        const [epsilonVariable, rules] = entry;

        grammar.set(
          epsilonVariable,
          rules.filter((rule) => !isEpsilonRule(rule))
        );

        hasRemovedEpsilonRule.add(epsilonVariable);

        for (const [variable, rules] of grammar.entries())
          grammar.set(
            variable,
            uniqueRules(
              rules.flatMap((rule) =>
                rule
                  .map((sym, i) => [sym, i] as [string, number])
                  .filter(([sym]) => sym === epsilonVariable)
                  .map(([, i]) => i)
                  .reduce((subsets, value) => subsets.concat(subsets.map((set) => new Set([value, ...set]))), [new Set<number>()])
                  .map((positions) => rule.filter((sym, i) => sym !== epsilonVariable || positions.has(i)))
                  .map((rule) => (rule.length === 0 ? [EPSILON] : rule))
              )
            ).filter((rule) => !isEpsilonRule(rule) || !hasRemovedEpsilonRule.has(variable))
          );
      }

      const isUnitRule = (variables: Set<string>, rule: string[]) => rule.length === 1 && variables.has(rule[0]);

      const hasRemovedUnitRule = new Map<string, Set<string>>(grammar.keys().map((variable) => [variable, new Set()]));
      while ((entry = grammar.entries().find(([, rules]) => rules.find((rule) => isUnitRule(variables, rule))) ?? null)) {
        const [variable, rules] = entry;
        const [unit] = rules.find((rule) => isUnitRule(variables, rule))!;

        grammar.set(
          variable,
          uniqueRules([
            ...rules.filter((rule) => hashRule(rule) !== unit),
            ...(hasRemovedUnitRule.get(variable)!.has(unit) ? [] : grammar.get(unit)!),
          ])
        );

        hasRemovedUnitRule.get(variable)!.add(unit);
      }

      const generating = new Set(grammar.values().flatMap((rules) => rules.flatMap((rule) => rule.filter((sym) => !variables.has(sym)))));

      while (
        (entry =
          grammar
            .entries()
            .find(
              ([variable, rules]) => !generating.has(variable) && rules.find((rule) => isEpsilonRule(rule) || new Set(rule).isSubsetOf(generating))
            ) ?? null)
      ) {
        const [variable] = entry;
        generating.add(variable);
      }

      for (const variable of [...variables]) {
        if (!generating.has(variable)) {
          variables.delete(variable);
          grammar.delete(variable);
        }
      }

      for (const [variable, rules] of grammar.entries())
        grammar.set(
          variable,
          rules.filter((rule) => rule.every((sym) => generating.has(sym)))
        );

      const reachable = new Set<string>([start]);
      const stk = [start];

      while (stk.length !== 0) {
        const variable = stk.pop()!;

        for (const rules of grammar.get(variable) ?? [])
          for (const rule of rules)
            for (const sym of rule)
              if (!reachable.has(sym)) {
                reachable.add(sym);
                if (variables.has(sym)) stk.push(sym);
              }
      }

      for (const [variable, rules] of grammar.entries())
        grammar.set(
          variable,
          rules.filter((rule) => rule.every((sym) => reachable.has(sym)))
        );

      const terminalCache = new Map<string, string>();

      for (const [variable, rules] of grammar.entries())
        if (rules.length === 1 && rules[0].length === 1 && !variables.has(rules[0][0]) && !terminalCache.has(rules[0][0]))
          terminalCache.set(rules[0][0], variable);

      let terminalIndex = 0;
      for (const rules of [...grammar.values()]) {
        for (const rule of rules) {
          if (isEpsilonRule(rule)) continue;
          for (const sym of rule)
            if (!variables.has(sym) && !terminalCache.has(sym)) {
              const terminalVariable = `U${++terminalIndex}`;
              grammar.set(terminalVariable, [[sym]]);
              variables.add(terminalVariable);
              terminalCache.set(sym, terminalVariable);
            }
        }
      }

      for (const [variable, rules] of grammar.entries())
        grammar.set(
          variable,
          rules.map((rule) =>
            rule.length === 1 ? rule : rule.map((sym) => (variables.has(sym) || terminalCache.get(sym) === variable ? sym : terminalCache.get(sym)!))
          )
        );

      for (const [variable, rules] of [...grammar.entries()]) {
        const newRules = [];

        let helperIndex = 0;
        for (const rule of rules) {
          if (rule.length <= 2) {
            newRules.push(rule);
            continue;
          }

          newRules.push([rule[0], `${variable}${++helperIndex}`]);

          for (let i = 1; i <= rule.length - 3; ++i, ++helperIndex) {
            variables.add(`${variable}${helperIndex}`);
            grammar.set(`${variable}${helperIndex}`, [[rule[i + 1], `${variable}${helperIndex + 1}`]]);
          }

          variables.add(`${variable}${helperIndex}`);
          grammar.set(`${variable}${helperIndex}`, [[rule[rule.length - 2], rule[rule.length - 1]]]);
        }

        grammar.set(variable, newRules);
      }

      console.log(grammar);

      self.postMessage({
        success: true,
        cnf: [
          ...variables.values().map(
            (v) =>
              `${v}\t-> ${grammar
                .get(v)!
                .toSorted()
                .map((r) => r.join(" "))
                .join(" | ")}`
          ),
        ].join("\n"),
      });
    } catch {
      self.postMessage({ success: false });
    }
  };
})();
