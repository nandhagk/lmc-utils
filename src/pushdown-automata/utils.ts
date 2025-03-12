import { ALT_EPSILON, EPSILON } from "@/finite-automata/lexer";

export const hashRule = (rule: string[]) => rule.join(" ");
export const unHashRule = (hash: string) => hash.split(" ");
export const uniqueRules = (rules: string[][]) =>
  [...new Set(rules.map((rule) => hashRule(rule)))].map((hash) => unHashRule(hash)).filter((rule) => rule.length !== 0);

export const isEpsilonRule = (rule: string[]) => rule.length === 1 && rule[0] === EPSILON;
export const isUnitRule = (variables: Set<string>, rule: string[]) => rule.length === 1 && variables.has(rule[0]);

export const findGenerating = (variables: Set<string>, grammar: Map<string, string[][]>) => {
  const generating = new Set(grammar.values().flatMap((rules) => rules.flatMap((rule) => rule.filter((sym) => !variables.has(sym)))));

  let entry: [string, string[][]] | null = null;
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

  return generating;
};

export const findReachable = (variables: Set<string>, grammar: Map<string, string[][]>) => {
  const [start] = variables.values();

  const reachable = new Set<string>([start]);
  const stk = [start];

  while (stk.length !== 0) {
    const variable = stk.pop()!;

    for (const rule of grammar.get(variable) ?? []) {
      for (const sym of rule) {
        if (!reachable.has(sym)) {
          reachable.add(sym);
          if (variables.has(sym)) stk.push(sym);
        }
      }
    }
  }

  return reachable;
};

export const parseCFG = (cfg: string) => {
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
                .map((sym) => (sym === ALT_EPSILON ? EPSILON : sym))
            ),
          ] as [string, string[][]]
      )
  );
};

// WARNING!: mutates arguments
export const simplifyCFG = (variables: Set<string>, grammar: Map<string, string[][]>) => {
  const [start] = variables.values();

  const generating = findGenerating(variables, grammar);
  if (!generating.has(start)) {
    variables.clear();
    grammar.clear();

    return;
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

  const reachable = findReachable(variables, grammar);
  for (const variable of [...variables]) {
    if (!reachable.has(variable)) {
      variables.delete(variable);
      grammar.delete(variable);
    }
  }

  for (const [variable, rules] of grammar.entries())
    grammar.set(
      variable,
      rules.filter((rule) => rule.every((sym) => reachable.has(sym)))
    );
};

export const formatCFG = (variables: Set<string>, grammar: Map<string, string[][]>) =>
  [
    ...variables.values().map(
      (v) =>
        `${v}\t-> ${grammar
          .get(v)!
          .toSorted()
          .map((r) => r.join(" "))
          .join(" | ")}`
    ),
  ].join("\n");
