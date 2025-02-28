(async () => {
  const [{ EPSILON }] = await Promise.all([import("@/finite-automata/tokenizer")]);
  const hashRule = (rule: string[]) => rule.join(" ");
  const areRulesEqual = (r1: string[], r2: string[]) => hashRule(r1) === hashRule(r2);

  const parseCFG = (cfg: string) => {
    return cfg
      .split("\n")
      .map((rule) => rule.split("->"))
      .map(([variable, subs]) => [
        variable.trim(),
        [
          ...new Set(
            subs.split("|").map((sub) =>
              hashRule(
                sub
                  .trim()
                  .split(" ")
                  .map((sym) => (sym === "~" ? EPSILON : sym))
              )
            )
          ),
        ].map((sub) => sub.split(" ")),
      ]) as [string, string[][]][];
  };

  const removeEpsilonRule = (variables: string[], grammar: Map<string, string[][]>, epsilonVariable: string) => {
    for (const variable of variables) {
      const newRules: string[][] = [];

      const rules = grammar.get(variable)!;
      for (const rule of rules) {
        const idxs = rule
          .map((v, i) => [v, i] as [string, number])
          .filter(([v]) => v === epsilonVariable)
          .map(([, i]) => i);

        if (idxs.length === 0) continue;

        for (let k = 1n << BigInt(idxs.length); k >= 0n; --k) {
          const newRule = rule.filter((v, i) => v !== epsilonVariable || (k >> BigInt(idxs.indexOf(i))) & 1n);
          if (newRule.length === 0) {
            if (variable === epsilonVariable) continue;
            newRule.push(EPSILON);
          }

          if (newRules.some((rule) => areRulesEqual(rule, newRule))) continue;
          newRules.push(newRule);
        }
      }

      for (const newRule of newRules) {
        if (rules.some((rule) => areRulesEqual(rule, newRule))) continue;
        rules.push(newRule);
      }
    }
  };

  const removeEpsilonRules = (variables: string[], grammar: Map<string, string[][]>) => {
    let hasEpsilonRule = true;
    while (hasEpsilonRule) {
      hasEpsilonRule = false;

      for (const variable of variables.toReversed()) {
        if (variable === variables[0]) continue;

        const rules = grammar.get(variable)!;
        for (let j = 0; j < rules.length; ++j) {
          const rule = rules[j];
          if (rule.length !== 1 || rule[0] !== EPSILON) continue;

          rules.splice(j, 1);
          --j;

          removeEpsilonRule(variables, grammar, variable);
          hasEpsilonRule = true;
        }
      }
    }
  };

  const removeUnitRules = (variables: string[], grammar: Map<string, string[][]>) => {
    let hasUnitRule = true;
    while (hasUnitRule) {
      hasUnitRule = false;

      for (const variable of variables.toReversed()) {
        const rules = grammar.get(variable)!;
        for (let j = 0; j < rules.length; ++j) {
          const rule = rules[j];
          if (rule.length !== 1 || variables.indexOf(rule[0]) === -1) continue;

          const unitVariable = rule[0];

          rules.splice(j, 1);
          for (const newRule of grammar.get(unitVariable)!) {
            if (unitVariable === variable || rules.some((rule) => areRulesEqual(rule, newRule))) continue;
            rules.push(newRule);
          }

          hasUnitRule = true;
        }
      }
    }
  };

  const convertToProperForm = (variables: string[], grammar: Map<string, string[][]>) => {
    const terminalMap = new Map<string, string>();
    const rulesMap = new Map<string, string>();

    for (const variable of variables) {
      const rules = grammar.get(variable)!;
      if (rules.length !== 1 || rules[0].length !== 1) continue;

      const terminal = rules[0][0];
      if (grammar.has(terminal)) throw new Error("HOW");

      if (!terminalMap.has(terminal)) terminalMap.set(terminal, variable);
    }

    let terminalIndex = 0;
    for (const variable of variables.toReversed()) {
      const rules = grammar.get(variable)!;
      for (const rule of rules) {
        if (rule.length < 2) continue;

        for (let i = 0; i < rule.length; ++i) {
          if (grammar.has(rule[i])) continue;

          if (!terminalMap.has(rule[i])) {
            const terminalVariable = `U${++terminalIndex}`;
            variables.push(terminalVariable);
            grammar.set(terminalVariable, [[rule[i]]]);
            terminalMap.set(rule[i], terminalVariable);
          }

          rule[i] = terminalMap.get(rule[i])!;
        }
      }
    }

    for (const variable of variables) {
      const rules = grammar.get(variable)!;
      if (rules.length !== 1) continue;

      const rule = hashRule(rules[0]);
      if (!rulesMap.has(rule)) rulesMap.set(rule, variable);
    }

    for (const variable of variables.toReversed()) {
      const rules = grammar.get(variable)!;

      const newGrammar = new Map<string, string[][]>();
      const newVariables = [];

      let variableIndex = 0;
      for (const rule of rules) {
        if (rule.length < 2) {
          if (!newGrammar.has(variable)) newGrammar.set(variable, []);
          newGrammar.get(variable)!.push(rule);

          continue;
        }

        let prevVariable = variable;
        for (let i = 0; i < rule.length - 1; ++i) {
          const other = rule.slice(i + 1);
          const hash = hashRule(other);

          if (i === rule.length - 2) {
            if (!newGrammar.has(prevVariable)) newGrammar.set(prevVariable, []);
            newGrammar.get(prevVariable)!.push([rule[i], rule[i + 1]]);

            break;
          }

          if (rulesMap.has(hash)) {
            if (!newGrammar.has(prevVariable)) newGrammar.set(prevVariable, []);
            newGrammar.get(prevVariable)!.push([rule[i], rulesMap.get(hash)!]);

            break;
          }

          const nextVariable = `${variable}${++variableIndex}`;

          newVariables.push(nextVariable);
          rulesMap.set(hash, nextVariable);

          if (!newGrammar.has(prevVariable)) newGrammar.set(prevVariable, []);
          newGrammar.get(prevVariable)!.push([rule[i], rulesMap.get(hash)!]);

          prevVariable = nextVariable;
        }
      }

      for (const [k, v] of newGrammar.entries()) grammar.set(k, v);
      variables.splice(variables.indexOf(variable) + 1, 0, ...newVariables);
    }
  };

  self.onmessage = (e: MessageEvent<{ cfg: string }>) => {
    const { cfg } = e.data;

    try {
      const parsed = parseCFG(cfg);
      parsed.splice(0, 0, [parsed[0][0] + "0", [[parsed[0][0]]]]);

      const variables = parsed.map(([variable]) => variable);
      const grammar = new Map(parsed);

      removeEpsilonRules(variables, grammar);
      removeUnitRules(variables, grammar);
      convertToProperForm(variables, grammar);

      const stk = [variables[0]];
      const reachable = new Set(stk);

      while (stk.length !== 0) {
        const variable = stk.pop()!;
        const rules = grammar.get(variable)!;

        for (const rule of rules) {
          for (const sym of rule) {
            if (!grammar.has(sym)) continue;

            if (!reachable.has(sym)) {
              reachable.add(sym);
              stk.push(sym);
            }
          }
        }
      }

      self.postMessage({
        success: true,
        cnf: variables
          .filter((v) => reachable.has(v))
          .map(
            (v) =>
              `${v}\t-> ${grammar
                .get(v)!
                .toSorted()
                .map((r) => r.join(" "))
                .join(" | ")}`
          )
          .join("\n"),
      });
    } catch {
      self.postMessage({ success: false });
    }
  };
})();
