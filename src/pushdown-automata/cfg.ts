import { ALT_EPSILON, EPSILON } from "@/finite-automata/lexer";
import { DefaultHashMap, HashMap, HashSet } from "@/lib/hash";
import { product } from "@/lib/utils";
import { PDA } from "@/pushdown-automata/pda";

export class CFG {
  public constructor(
    public alphabet: HashSet<string>,
    public variables: HashSet<string>,
    public productions: DefaultHashMap<string, HashSet<string[]>>
  ) {}

  public static isEpsilonRule(rule: string[]) {
    return rule.length === 1 && rule[0] === EPSILON;
  }

  public isUnitRule(rule: string[]) {
    return rule.length === 1 && this.variables.has(rule[0]);
  }

  public generating() {
    const generating = new HashSet([...this.alphabet, EPSILON]);

    for (;;) {
      const entry = this.productions
        .entries()
        .filter(([variable]) => !generating.has(variable))
        .find(([, rules]) => rules.values().find((rule) => generating.isSupersetOf(rule)));
      if (entry === undefined) break;

      const [variable] = entry;
      generating.add(variable);
    }

    return generating;
  }

  public reachable() {
    const [start] = this.variables.values();

    const reachable = new HashSet<string>([start]);
    const stk = [start];

    while (stk.length !== 0) {
      const variable = stk.pop()!;

      for (const rule of this.productions.get(variable)) {
        for (const sym of rule) {
          if (!reachable.has(sym)) {
            reachable.add(sym);
            if (this.variables.has(sym)) stk.push(sym);
          }
        }
      }
    }

    return reachable;
  }

  public removeEpsilonRules() {
    const [start] = this.variables;
    const hasRemovedEpsilonRule = new HashSet<string>();

    for (;;) {
      const entry = this.productions
        .entries()
        .find(([variable, rules]) => variable !== start && rules.values().find((rule) => CFG.isEpsilonRule(rule)));

      if (entry === undefined) break;
      const [epsilonVariable, rules] = entry;

      this.productions.set(epsilonVariable, new HashSet(rules.values().filter((rule) => !CFG.isEpsilonRule(rule))));

      hasRemovedEpsilonRule.add(epsilonVariable);

      for (const [variable, rules] of this.productions.entries())
        this.productions.set(
          variable,
          new HashSet(
            rules
              .values()
              .flatMap((rule) =>
                rule
                  .map((sym, i) => [sym, i] as [string, number])
                  .filter(([sym]) => sym === epsilonVariable)
                  .map(([, i]) => i)
                  .reduce((subsets, value) => subsets.concat(subsets.map((set) => new HashSet([value, ...set]))), [new HashSet<number>()])
                  .map((positions) => rule.filter((sym, i) => sym !== epsilonVariable || positions.has(i)))
                  .map((rule) => (rule.length === 0 ? [EPSILON] : rule))
              )
              .filter((rule) => !CFG.isEpsilonRule(rule) || !hasRemovedEpsilonRule.has(variable))
          )
        );
    }
  }

  public removeUnitRules() {
    const hasRemovedUnitRule = new HashMap<string, HashSet<string>>(this.productions.keys().map((variable) => [variable, new HashSet()]));
    for (;;) {
      const entry = this.productions.entries().find(([, rules]) => rules.values().find((rule) => this.isUnitRule(rule)));
      if (entry === undefined) break;
      const [variable, rules] = entry;
      const [unit] = rules.values().find((rule) => this.isUnitRule(rule))!;

      const removedUnitRules = hasRemovedUnitRule.get(variable)!;
      this.productions.set(
        variable,
        new HashSet([
          ...rules.values().filter((rule) => !(this.isUnitRule(rule) && rule[0] === unit)),
          ...(removedUnitRules.has(unit) ? [] : this.productions.get(unit)!),
        ])
      );

      removedUnitRules.add(unit);
    }
  }

  public simplify() {
    const [start] = this.variables.values();

    const generating = this.generating();
    if (!generating.has(start)) {
      this.variables.clear();
      this.productions.clear();

      return;
    }

    for (const variable of [...this.variables]) {
      if (generating.has(variable)) continue;

      this.variables.delete(variable);
      this.productions.delete(variable);
    }

    for (const [variable, rules] of this.productions.entries()) {
      this.productions.set(variable, new HashSet(rules.values().filter((rule) => rule.every((sym) => generating.has(sym)))));
    }

    const reachable = this.reachable();

    for (const variable of [...this.variables]) {
      if (reachable.has(variable)) continue;

      this.variables.delete(variable);
      this.productions.delete(variable);
    }

    for (const [variable, rules] of this.productions.entries()) {
      this.productions.set(variable, new HashSet(rules.values().filter((rule) => rule.every((sym) => reachable.has(sym)))));
    }

    for (const [variable, rules] of this.productions.entries()) {
      this.productions.set(
        variable,
        new HashSet(rules.values().map((rule) => (CFG.isEpsilonRule(rule) ? rule : rule.filter((sym) => sym !== EPSILON))))
      );
    }
  }

  public rename() {
    const M = new HashMap<string, string>();

    let id = 0;
    for (const variable of this.variables) M.set(variable, String.fromCharCode(65 + id++));

    this.productions = new DefaultHashMap(
      () => new HashSet(),
      this.productions
        .entries()
        .map(([variable, rules]) => [
          M.get(variable)!,
          new HashSet(rules.values().map((rule) => rule.map((sym) => (this.variables.has(sym) ? M.get(sym)! : sym)))),
        ])
    );

    this.variables = new HashSet(M.values());
  }

  public static fromCFG(alphabet: HashSet<string>, text: string) {
    const productions = new DefaultHashMap<string, HashSet<string[]>>(
      () => new HashSet(),
      text
        .split("\n")
        .map((production) => production.split("->"))
        .map(([variable, rules]) => [
          variable.trim(),
          new HashSet(rules.split("|").map((rule) => rule.trim().replaceAll(ALT_EPSILON, EPSILON).split(" "))),
        ])
    );

    const variables = new HashSet(productions.keys());
    for (const rules of productions.values()) {
      for (const rule of rules) {
        for (const sym of rule) {
          if (!alphabet.has(sym) && sym !== EPSILON) variables.add(sym);
        }
      }
    }

    return new CFG(alphabet, variables, productions);
  }

  public static fromPDA(p: PDA) {
    const z = PDA.toCFG(p);

    const Q = z.Q;
    const D = z.D;
    const T = z.T;
    const A = z.A;
    const S = z.S;
    const [F] = z.F;

    const fv = (cur: number, nxt: number) => `A${cur}${nxt}`;

    const variables = new HashSet([fv(S, F)]);
    for (const [p, q] of product(Q, Q)) {
      variables.add(fv(p, q));
    }

    const productions = new DefaultHashMap<string, HashSet<string[]>>(() => new HashSet());

    for (const [p, q, r, s] of product(Q, Q, Q, Q)) {
      for (const u of T) {
        for (const [a, b] of product([...A, EPSILON], [...A, EPSILON])) {
          if (D.get([p, a, EPSILON]).has([r, u]) && D.get([s, b, u]).has([q, EPSILON])) {
            productions.get(fv(p, q)).add([a, fv(r, s), b]);
          }
        }
      }
    }

    for (const [p, q, r] of product(Q, Q, Q)) {
      productions.get(fv(p, q)).add([fv(p, r), fv(r, q)]);
    }

    for (const p of Q) {
      productions.get(fv(p, p)).add([EPSILON]);
    }

    const c = new CFG(A, variables, productions);

    c.simplify();
    c.removeEpsilonRules();
    c.removeUnitRules();
    c.simplify();

    c.rename();
    return c;
  }

  public toString() {
    return [
      ...this.variables.values().map(
        (v) =>
          `${v}\t-> ${[...this.productions.get(v)]
            .toSorted()
            .map((rule) => rule.join(" "))
            .join(" | ")}`
      ),
    ].join("\n");
  }
}
