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

      const [variable, rules] = entry;

      this.productions.set(variable, new HashSet(rules.values().filter((rule) => !CFG.isEpsilonRule(rule))));
      hasRemovedEpsilonRule.add(variable);

      for (const [v, rules] of this.productions.entries())
        this.productions.set(
          v,
          new HashSet(
            rules
              .values()
              .flatMap((rule) =>
                rule
                  .map((sym, i) => [sym, i] as [string, number])
                  .filter(([sym]) => sym === variable)
                  .map(([, i]) => i)
                  .reduce((subsets, value) => subsets.concat(subsets.map((set) => new HashSet([value, ...set]))), [new HashSet<number>()])
                  .map((positions) => rule.filter((sym, i) => sym !== variable || positions.has(i)))
                  .map((rule) => (rule.length === 0 ? [EPSILON] : rule))
              )
              .filter((rule) => !CFG.isEpsilonRule(rule) || !hasRemovedEpsilonRule.has(v))
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

  public replaceSingletonRules() {
    const [start] = this.variables;
    for (const [variable, rules] of this.productions.entries()) {
      if (rules.size !== 1) continue;

      const [rule] = rules;
      if (rule.length !== 1) continue;

      if (variable === start) continue;

      this.variables.delete(variable);
      this.productions.delete(variable);

      for (const [v, rs] of this.productions.entries()) {
        this.productions.set(
          v,
          new HashSet(
            rs
              .values()
              .map((r) => r.map((s) => (s === variable ? rule[0] : s)))
              .map((rule) => (CFG.isEpsilonRule(rule) ? rule : rule.filter((sym) => sym !== EPSILON)))
          )
        );
      }
    }
  }

  public simplify() {
    for (const [variable, rules] of this.productions.entries()) {
      this.productions.set(variable, new HashSet(rules.values().filter((rule) => !(this.isUnitRule(rule) && rule[0] === variable))));
    }

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
    const productions = new DefaultHashMap<string, HashSet<string[]>>(() => new HashSet());

    const cfg = text
      .split("\n")
      .map((production) => production.split("->"))
      .map(
        ([variable, rules]) =>
          [
            variable.trim(),
            rules
              .split("|")
              .map((rule) => rule.trim().replaceAll(ALT_EPSILON, EPSILON).split(" "))
              .map((rule) => (this.isEpsilonRule(rule) ? rule : rule.filter((sym) => sym !== EPSILON))),
          ] as [string, string[][]]
      );

    for (const [variable, rules] of cfg) {
      for (const rule of rules) {
        productions.get(variable).add(rule);
      }
    }

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
    const A = z.A;
    const S = z.S;
    const [F] = z.F;

    const fv = (cur: number, nxt: number) => `A${cur}${nxt}`;

    const variables = new HashSet([fv(S, F)]);
    for (const [p, q] of product(Q, Q)) {
      variables.add(fv(p, q));
    }

    const productions = new DefaultHashMap<string, HashSet<string[]>>(() => new HashSet());

    const peeker = new DefaultHashMap<[number, string], HashSet<[number, string]>>(() => new HashSet());
    const popper = new DefaultHashMap<number, HashSet<[number, string, string]>>(() => new HashSet());

    for (const [[cur, sym, pop], cs] of D.entries()) {
      for (const [nxt, push] of cs) {
        if (pop === EPSILON && push !== EPSILON) {
          peeker.get([nxt, push]).add([cur, sym]);
        } else if (pop !== EPSILON && push === EPSILON) {
          popper.get(nxt).add([cur, sym, pop]);
        } else {
          throw new Error("HOW");
        }
      }
    }

    for (const [[r, u], cs] of peeker.entries()) {
      for (const [p, a] of cs) {
        for (const [q, ds] of popper.entries()) {
          for (const [s, b, v] of ds) {
            if (u !== v) continue;

            const rule = [];
            if (a !== EPSILON) rule.push(a);
            rule.push(fv(r, s));
            if (b !== EPSILON) rule.push(b);

            productions.get(fv(p, q)).add(rule);
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
    for (const [variable, rules] of c.productions.entries()) {
      if (rules.size !== 2) continue;
      if (!rules.isEqual([[variable, variable], [EPSILON]])) continue;

      c.productions.set(variable, new HashSet([[EPSILON]]));
    }

    c.simplify();

    const [start] = c.variables;
    while (c.productions.entries().find(([variable, rules]) => variable !== start && rules.size === 1 && [...rules][0].length === 1) !== undefined) {
      c.replaceSingletonRules();
      c.simplify();
    }

    c.rename();
    return c;
  }

  public toString() {
    return [
      ...this.variables.values().map(
        (variable) =>
          `${variable}\t-> ${[...this.productions.get(variable)]
            .toSorted()
            .map((rule) => rule.join(" "))
            .join(" | ")}`
      ),
    ].join("\n");
  }

  public cnf() {
    const start = "S0";

    const [s] = this.variables;
    this.variables = new HashSet([start, ...this.variables]);
    this.productions.set(start, new HashSet([[s]]));

    this.removeEpsilonRules();
    this.removeUnitRules();

    const cache = new HashMap<string[], string>();
    for (const [variable, rules] of this.productions.entries()) {
      if (rules.size !== 1) continue;

      const [rule] = rules;
      if (rule.length !== 1) continue;

      if (this.alphabet.has(rule[0]) && !cache.has(rule)) cache.set(rule, variable);
    }

    let terminalIndex = 0;
    for (const rules of [...this.productions.values()]) {
      for (const rule of rules) {
        if (CFG.isEpsilonRule(rule)) continue;
        for (const sym of rule) {
          if (this.alphabet.has(sym) && !cache.has([sym])) {
            const terminalVariable = `U${++terminalIndex}`;
            this.productions.set(terminalVariable, new HashSet([[sym]]));
            this.variables.add(terminalVariable);
            cache.set([sym], terminalVariable);
          }
        }
      }
    }

    for (const [variable, rules] of this.productions.entries())
      this.productions.set(
        variable,
        new HashSet(
          rules
            .values()
            .map((rule) =>
              rule.length === 1 ? rule : rule.map((sym) => (this.variables.has(sym) || cache.get([sym]) === variable ? sym : cache.get([sym])!))
            )
        )
      );

    for (const variable of [...this.variables].toReversed()) {
      const rules = [...this.productions.get(variable)!];
      const newRules = new HashSet<string[]>();

      let helperIndex = 0;
      for (const rule of rules) {
        if (rule.length <= 2) {
          newRules.add(rule);
          continue;
        }

        const left = rule.slice(1);
        if (cache.has(left)) {
          newRules.add([rule[0], cache.get(left)!]);
          continue;
        }

        let prvVariable = `${variable}${++helperIndex}`;
        this.variables.add(prvVariable);
        newRules.add([rule[0], prvVariable]);
        cache.set(left, prvVariable);

        for (let i = 1; i < rule.length - 1; ++i) {
          if (i === rule.length - 2) {
            this.productions.set(prvVariable, new HashSet([[rule[i], rule[i + 1]]]));
            break;
          }

          const left = rule.slice(i + 1);
          if (cache.has(left)) {
            this.productions.set(prvVariable, new HashSet([[rule[i], cache.get(left)!]]));
            break;
          }

          const newVariable = `${variable}${++helperIndex}`;
          this.variables.add(newVariable);
          this.productions.set(prvVariable, new HashSet([[rule[i], newVariable]]));
          cache.set(left, newVariable);
          prvVariable = newVariable;
        }
      }

      this.productions.set(variable, newRules);
    }

    this.simplify();
  }
}
