import { ALT_EPSILON, EPSILON } from "@/finite-automata/lexer";
import { DefaultHashMap, HashMap, HashSet } from "@/lib/hash";
import { product } from "@/lib/utils";
import { PDA } from "@/pushdown-automata/pda";

export type Rule = string[];

export class CFG {
  public constructor(public T: HashSet<string>, public V: HashSet<string>, public S: string, public P: DefaultHashMap<string, HashSet<Rule>>) {}

  public isEpsilonRule(rule: Rule): boolean {
    return rule.length === 1 && rule[0] === EPSILON;
  }

  public isUnitRule(rule: Rule): boolean {
    return rule.length === 1 && this.V.has(rule[0]);
  }

  public isSelfRecursiveUnitRule(variable: string, rule: Rule): boolean {
    return this.isUnitRule(rule) && rule[0] === variable;
  }

  public findGeneratingVariables(): HashSet<string> {
    const G = new HashSet<string>();

    for (;;) {
      const entry = this.P.entries()
        .filter(([variable]) => !G.has(variable))
        .find(([, rules]) => rules.values().find((rule) => rule.every((sym) => !this.V.has(sym) || G.has(sym))));
      if (entry === undefined) break;

      const [variable] = entry;
      G.add(variable);
    }

    return G;
  }

  public findReachableVariables(): HashSet<string> {
    const R = new HashSet<string>([this.S]);

    const stk = [this.S];
    while (stk.length !== 0) {
      const variable = stk.pop()!;

      for (const rule of this.P.get(variable)) {
        for (const sym of rule) {
          if (!this.V.has(sym) || R.has(sym)) continue;

          R.add(sym);
          stk.push(sym);
        }
      }
    }

    return R;
  }

  public findNullableVariables(): HashSet<string> {
    const N = new HashSet<string>();

    for (;;) {
      const entry = this.P.entries()
        .filter(([variable]) => !N.has(variable))
        .find(([, rules]) => rules.values().find((rule) => rule.every((sym) => sym === EPSILON || N.has(sym))));
      if (entry === undefined) break;

      const [variable] = entry;
      N.add(variable);
    }

    return N;
  }

  public findNullVariables(): HashSet<string> {
    const E = new HashSet<string>();

    for (;;) {
      const entry = this.P.entries()
        .filter(([variable]) => !E.has(variable))
        .find(([, rules]) => rules.values().find((rule) => rule.some((sym) => this.T.has(sym) || E.has(sym))));
      if (entry === undefined) break;

      const [variable] = entry;
      E.add(variable);
    }

    return this.V.difference(E);
  }

  public eliminateNonGeneratingVariables(): CFG {
    const T = this.T;
    const U = this.V;
    const S = this.S;
    const O = this.P;

    const G = this.findGeneratingVariables();

    const V = new HashSet([S, ...G]);
    const P = new DefaultHashMap<string, HashSet<Rule>>(
      () => new HashSet(),
      O.entries()
        .filter(([variable]) => V.has(variable))
        .map(([variable, rules]) => [variable, new HashSet(rules.values().filter((rule) => rule.every((sym) => !U.has(sym) || G.has(sym))))])
    );

    return new CFG(T, V, S, P);
  }

  public eliminateUnreachableVariables(): CFG {
    const T = this.T;
    const U = this.V;
    const S = this.S;
    const O = this.P;

    const R = this.findReachableVariables();

    const V = new HashSet(R);
    const P = new DefaultHashMap<string, HashSet<Rule>>(
      () => new HashSet(),
      O.entries()
        .filter(([variable]) => V.has(variable))
        .map(([variable, rules]) => [variable, new HashSet(rules.values().filter((rule) => rule.every((sym) => !U.has(sym) || R.has(sym))))])
    );

    return new CFG(T, V, S, P);
  }

  public eliminateSelfRecursiveUnitRules(): CFG {
    const T = this.T;
    const V = this.V;
    const S = this.S;
    const O = this.P;

    const P = new DefaultHashMap<string, HashSet<Rule>>(
      () => new HashSet(),
      O.entries().map(([variable, rules]) => [variable, new HashSet(rules.values().filter((rule) => !this.isSelfRecursiveUnitRule(variable, rule)))])
    );

    return new CFG(T, V, S, P);
  }

  public eliminateDelegatingVariables(): CFG {
    const T = this.T;
    const U = this.V;
    const S = this.S;
    const O = this.P;

    const V = new HashSet(U);

    let P = new DefaultHashMap<string, HashSet<Rule>>(() => new HashSet(), O);
    for (;;) {
      const entry = P.entries().find(([variable, rules]) => {
        if (rules.size !== 1) return false;

        const [rule] = rules;
        return this.isUnitRule(rule) && !this.isSelfRecursiveUnitRule(variable, rule);
      });
      if (entry === undefined) break;

      const [delegatingVariable, rules] = entry;
      const [rule] = rules;
      const [delegatedVariable] = rule;

      P.set(delegatingVariable, P.get(delegatedVariable));

      V.delete(delegatedVariable);
      P.delete(delegatedVariable);

      P = new DefaultHashMap<string, HashSet<Rule>>(
        () => new HashSet(),
        P.entries().map(([variable, rules]) => [
          variable,
          new HashSet(rules.values().map((rule) => rule.map((sym) => (sym === delegatedVariable ? delegatingVariable : sym)))),
        ])
      );
    }

    return new CFG(T, V, S, P);
  }

  public eliminateSingleRuleVariables(): CFG {
    const T = this.T;
    const U = this.V;
    const S = this.S;
    const O = this.P;

    const V = new HashSet(U);

    let P = new DefaultHashMap<string, HashSet<Rule>>(() => new HashSet(), O);
    for (;;) {
      const entry = P.entries()
        .filter(([variable]) => variable !== S)
        .find(([variable, rules]) => {
          if (rules.size !== 1) return false;

          const [rule] = rules;
          return !this.isSelfRecursiveUnitRule(variable, rule);
        });

      if (entry === undefined) break;

      const [singleRuleVariable, rules] = entry;
      const [singleRule] = rules;

      V.delete(singleRuleVariable);
      P.delete(singleRuleVariable);

      P = new DefaultHashMap<string, HashSet<Rule>>(
        () => new HashSet(),
        P.entries().map(([variable, rules]) => [
          variable,
          new HashSet(rules.values().map((rule) => rule.flatMap((sym) => (sym === singleRuleVariable ? singleRule : sym)))),
        ])
      );
    }

    return new CFG(T, V, S, P);
  }

  public eliminateNullVariables(): CFG {
    const T = this.T;
    const U = this.V;
    const S = this.S;
    const O = this.P;

    const E = this.findNullVariables();

    const V = new HashSet([S, ...U.values().filter((variable) => !E.has(variable))]);
    const P = new DefaultHashMap<string, HashSet<Rule>>(
      () => new HashSet(),
      O.entries()
        .filter(([variable]) => V.has(variable))
        .map(([variable, rules]) => [
          variable,
          new HashSet(
            rules
              .values()
              .map((rule) => rule.filter((sym) => !U.has(sym) || !E.has(sym)))
              .map((rule) => (rule.length === 0 ? [EPSILON] : rule))
          ),
        ])
    );

    return new CFG(T, V, S, P);
  }

  public eliminateNonSelfRecursiveVariables(): CFG {
    const T = this.T;
    const S = this.S;
    const V = this.V;
    const O = this.P;

    let P = new DefaultHashMap<string, HashSet<Rule>>(() => new HashSet(), O);
    for (;;) {
      const entry = P.entries()
        .filter(([variable]) => variable !== S)
        .find(([variable, rules]) => rules.values().every((rule) => rule.every((sym) => sym !== variable)));
      if (entry === undefined) break;

      const [nonSelfRecursiveVariable, nonSelfRecursiveRules] = entry;

      V.delete(nonSelfRecursiveVariable);
      P.delete(nonSelfRecursiveVariable);

      P = new DefaultHashMap<string, HashSet<Rule>>(
        () => new HashSet(),
        P.entries()
          .filter(([variable]) => variable !== nonSelfRecursiveVariable)
          .map(([variable, rules]) => [
            variable,
            new HashSet(
              rules.values().flatMap((rule) => {
                const positions = rule
                  .map((sym, i) => [sym, i] as [string, number])
                  .filter(([sym]) => sym === nonSelfRecursiveVariable)
                  .map(([, i]) => i);
                if (positions.length === 0) return [rule];

                return product(...positions.map(() => nonSelfRecursiveRules))
                  .map((subs) => new HashMap(positions.map((position, i) => [position, subs[i]])))
                  .map((subs) => rule.flatMap((sym, i) => (sym === nonSelfRecursiveVariable ? subs.get(i)! : sym)));
              })
            ),
          ])
      );
    }

    return new CFG(T, V, S, P);
  }

  public renameVariables(): CFG {
    const T = this.T;
    const U = this.V;
    const R = this.S;
    const O = this.P;

    const M = new HashMap<string, string>();

    const fv = (x: number) => {
      let v = "";
      for (;;) {
        v += String.fromCharCode(65 + (x % 26));

        x = Math.floor(x / 26);
        if (x === 0) break;
      }

      return v;
    };

    let id = 0;
    for (const variable of U) M.set(variable, fv(id++));

    const V = new HashSet(U.values().map((variable) => M.get(variable)!));
    const S = M.get(R)!;
    const P = new DefaultHashMap<string, HashSet<Rule>>(
      () => new HashSet(),
      O.entries().map(([variable, rules]) => [
        M.get(variable)!,
        new HashSet(rules.values().map((rule) => rule.map((sym) => (U.has(sym) ? M.get(sym)! : sym)))),
      ])
    );

    return new CFG(T, V, S, P);
  }

  public simplifyPassive(): CFG {
    return this.eliminateNonGeneratingVariables().eliminateUnreachableVariables().eliminateSelfRecursiveUnitRules();
  }

  public simplifyAggressive(): CFG {
    return this.simplifyPassive()
      .eliminateDelegatingVariables()
      .eliminateSingleRuleVariables()
      .eliminateNullVariables()
      .simplifyPassive()
      .eliminateDelegatingVariables()
      .eliminateSingleRuleVariables();
  }

  public augmentStart(S: string): CFG {
    const T = this.T;
    const U = this.V;
    const R = this.S;
    const O = this.P;

    const V = new HashSet([S, ...U]);

    const P = new DefaultHashMap<string, HashSet<Rule>>(() => new HashSet(), O);
    P.set(S, new HashSet([[R]]));

    return new CFG(T, V, S, P);
  }

  public eliminateEpsilonRules(): CFG {
    const T = this.T;
    const S = this.S;
    const V = this.V;
    const O = this.P;

    const hasRemovedEpsilonRule = new HashSet<string>();

    let P = new DefaultHashMap<string, HashSet<Rule>>(() => new HashSet(), O);
    for (;;) {
      const entry = P.entries()
        .filter(([variable]) => variable !== S)
        .find(([, rules]) => rules.values().find((rule) => this.isEpsilonRule(rule)));
      if (entry === undefined) break;

      const [epsilonVariable, rules] = entry;

      P.set(epsilonVariable, new HashSet(rules.values().filter((rule) => !this.isEpsilonRule(rule))));
      hasRemovedEpsilonRule.add(epsilonVariable);

      P = new DefaultHashMap<string, HashSet<Rule>>(
        () => new HashSet(),
        P.entries().map(([variable, rules]) => [
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
              .filter((rule) => !this.isEpsilonRule(rule) || !hasRemovedEpsilonRule.has(variable))
          ),
        ])
      );
    }

    return new CFG(T, V, S, P);
  }

  public eliminateUnitRules(): CFG {
    const T = this.T;
    const V = this.V;
    const S = this.S;
    const O = this.P;

    const hasRemovedUnitRule = new HashMap<string, HashSet<string>>(V.values().map((variable) => [variable, new HashSet()]));

    const P = new DefaultHashMap<string, HashSet<Rule>>(() => new HashSet(), O);
    for (;;) {
      const entry = P.entries().find(([, rules]) => rules.values().find((rule) => this.isUnitRule(rule)));
      if (entry === undefined) break;

      const [variable, rules] = entry;
      const [unitVariable] = rules.values().find((rule) => this.isUnitRule(rule))!;

      const removedUnitRules = hasRemovedUnitRule.get(variable)!;
      P.set(
        variable,
        new HashSet([
          ...rules.values().filter((rule) => !(this.isUnitRule(rule) && rule[0] === unitVariable)),
          ...(removedUnitRules.has(unitVariable) ? [] : P.get(unitVariable)!),
        ])
      );

      removedUnitRules.add(unitVariable);
    }

    return new CFG(T, V, S, P);
  }

  public static fromCFG(T: HashSet<string>, text: string) {
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
              .map((rule) => (rule.length === 1 && rule[0] === EPSILON ? rule : rule.filter((sym) => sym !== EPSILON))),
          ] as [string, Rule[]]
      );

    const P = new DefaultHashMap<string, HashSet<Rule>>(() => new HashSet());
    for (const [variable, rules] of cfg) {
      for (const rule of rules) {
        P.get(variable).add(rule);
      }
    }

    const V = new HashSet(P.keys());
    for (const rules of P.values()) {
      for (const rule of rules) {
        for (const sym of rule) {
          if (!T.has(sym) && sym !== EPSILON) V.add(sym);
        }
      }
    }

    const [S] = V;
    return new CFG(T, V, S, P).simplifyPassive();
  }

  public static fromPDA(p: PDA): CFG {
    const z = PDA.toCFG(p);

    const Q = z.Q;
    const D = z.D;
    const T = z.A;
    const R = z.S;
    const [F] = z.F;

    const fv = (cur: number, nxt: number) => `A${cur}${nxt}`;

    const S = fv(R, F);
    const V = new HashSet([S]);
    for (const [p, q] of product(Q, Q)) {
      V.add(fv(p, q));
    }

    const P = new DefaultHashMap<string, HashSet<Rule>>(() => new HashSet());

    const peeker = new DefaultHashMap<[number, string], HashSet<[number, string]>>(() => new HashSet());
    const popper = new DefaultHashMap<number, HashSet<[number, string, string]>>(() => new HashSet());

    for (const [[cur, sym, pop], cs] of D) {
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

    for (const [[r, u], cs] of peeker) {
      for (const [p, a] of cs) {
        for (const [q, ds] of popper) {
          for (const [s, b, v] of ds) {
            if (u !== v) continue;

            const rule = [];
            if (a !== EPSILON) rule.push(a);
            rule.push(fv(r, s));
            if (b !== EPSILON) rule.push(b);

            P.get(fv(p, q)).add(rule);
          }
        }
      }
    }

    for (const [p, q, r] of product(Q, Q, Q)) {
      P.get(fv(p, q)).add([fv(p, r), fv(r, q)]);
    }

    for (const p of Q) {
      P.get(fv(p, p)).add([EPSILON]);
    }

    return new CFG(T, V, S, P).simplifyAggressive().eliminateNonSelfRecursiveVariables().simplifyPassive().renameVariables();
  }

  public toCNF(): CFG {
    return this.simplifyPassive().augmentStart("S0").eliminateEpsilonRules().eliminateUnitRules().toCNFForm();
  }

  private toCNFForm(): CFG {
    const T = this.T;
    const U = this.V;
    const S = this.S;
    const O = this.P;

    const V = new HashSet(U);
    let P = new DefaultHashMap<string, HashSet<Rule>>(() => new HashSet(), O);

    const cache = new HashMap<Rule, string>();
    for (const [variable, rules] of P) {
      if (rules.size !== 1) continue;

      const [rule] = rules;
      if (rule.length !== 1) continue;

      const [sym] = rule;
      if (T.has(sym) && !cache.has(rule)) cache.set(rule, variable);
    }

    let terminalIndex = 0;
    for (const rules of [...P.values()]) {
      for (const rule of rules) {
        if (this.isEpsilonRule(rule)) continue;
        for (const sym of rule) {
          if (T.has(sym) && !cache.has([sym])) {
            const terminalVariable = `U${++terminalIndex}`;

            P.set(terminalVariable, new HashSet([[sym]]));
            V.add(terminalVariable);

            cache.set([sym], terminalVariable);
          }
        }
      }
    }

    P = new DefaultHashMap<string, HashSet<Rule>>(
      () => new HashSet(),
      P.entries().map(([variable, rules]) => [
        variable,
        new HashSet(
          rules
            .values()
            .map((rule) => (rule.length === 1 ? rule : rule.map((sym) => (V.has(sym) || cache.get([sym]) === variable ? sym : cache.get([sym])!))))
        ),
      ])
    );

    for (const variable of [...V].toReversed()) {
      const rules = [...P.get(variable)!];
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
        V.add(prvVariable);
        newRules.add([rule[0], prvVariable]);
        cache.set(left, prvVariable);

        for (let i = 1; i < rule.length - 1; ++i) {
          if (i === rule.length - 2) {
            P.set(prvVariable, new HashSet([[rule[i], rule[i + 1]]]));
            break;
          }

          const left = rule.slice(i + 1);
          if (cache.has(left)) {
            P.set(prvVariable, new HashSet([[rule[i], cache.get(left)!]]));
            break;
          }

          const newVariable = `${variable}${++helperIndex}`;

          V.add(newVariable);
          P.set(prvVariable, new HashSet([[rule[i], newVariable]]));

          cache.set(left, newVariable);
          prvVariable = newVariable;
        }
      }

      P.set(variable, newRules);
    }

    return new CFG(T, V, S, P);
  }

  public toString(): string {
    const V = this.V;
    const S = this.S;
    const P = this.P;

    return [
      ...new HashSet([S, ...V]).values().map(
        (variable) =>
          `${variable}\t-> ${[...P.get(variable)]
            .toSorted()
            .map((rule) => rule.join(" "))
            .join(" | ")}`
      ),
    ].join("\n");
  }
}
