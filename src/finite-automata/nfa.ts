import { DFA } from "@/finite-automata/dfa";
import { EPSILON, Lexer } from "@/finite-automata/lexer";
import { NFAVisitor, Parser } from "@/finite-automata/parser";

export class NFA {
  constructor(
    public Q: Set<number>,
    public A: Set<string>,
    public S: number,
    public D: Map<number, Map<string, Set<number>>>,
    public F: Set<number>
  ) {}

  public static id = 0;

  static null(A: Set<string>) {
    const S = this.id++;

    const F = new Set<number>();
    const Q = new Set([S]);

    const D = new Map();
    return new NFA(Q, A, S, D, F);
  }

  static empty(A: Set<string>) {
    const S = this.id++;

    const F = new Set([S]);
    const Q = new Set([S]);

    const D = new Map();
    return new NFA(Q, A, S, D, F);
  }

  static literal(A: Set<string>, sym: string) {
    const S = this.id++;
    const E = this.id++;

    const F = new Set([E]);
    const Q = new Set([S, E]);

    const D = new Map([[S, new Map([[sym, F]])]]);
    return new NFA(Q, A, S, D, F);
  }

  static union(n1: NFA, n2: NFA) {
    const S = this.id++;

    const A = new Set([...n1.A, ...n2.A]);
    const Q = new Set([...n1.Q, ...n2.Q, S]);
    const F = new Set([...n1.F, ...n2.F]);
    const D = new Map([...n1.D, ...n2.D, [S, new Map([[EPSILON, new Set([n1.S, n2.S])]])]]);

    return new NFA(Q, A, S, D, F);
  }

  static concatenate(n1: NFA, n2: NFA) {
    const S = n1.S;
    const T = n2.S;
    const E = n1.F;
    const F = n2.F;

    const A = new Set([...n1.A, ...n2.A]);
    const Q = new Set([...n1.Q, ...n2.Q]);
    const D = new Map([...n1.D, ...n2.D]);

    for (const f of E) {
      if (!D.has(f)) D.set(f, new Map());
      if (!D.get(f)!.has(EPSILON)) D.get(f)!.set(EPSILON, new Set());
      D.get(f)!.get(EPSILON)!.add(T);
    }

    return new NFA(Q, A, S, D, F);
  }

  static star(n: NFA) {
    const T = n.S;
    const A = n.A;
    const E = n.F;
    const D = n.D;

    const S = this.id++;

    const Q = new Set([...n.Q, S]);
    const F = new Set([...E, S]);

    D.set(S, new Map([[EPSILON, new Set([T])]]));
    for (const f of E) {
      if (!D.has(f)) D.set(f, new Map());
      if (!D.get(f)!.has(EPSILON)) D.get(f)!.set(EPSILON, new Set());
      D.get(f)!.get(EPSILON)!.add(T);
    }

    return new NFA(Q, A, S, D, F);
  }

  static fromDFA(d: DFA) {
    const A = d.A;
    const R = d.Q;
    const T = d.S;
    const E = d.F;
    const C = d.D;

    const M = new Map<number, number>();
    for (const r of R) M.set(r, this.id++);

    const Q = new Set(R.values().map((r) => M.get(r)!));
    const S = M.get(T)!;
    const F = new Set(E.values().map((e) => M.get(e)!));
    const D = new Map(C.entries().map(([k, v]) => [M.get(k)!, new Map(v.entries().map(([x, y]) => [x, new Set([M.get(y)!])]))]));

    return new NFA(Q, A, S, D, F);
  }

  static complement(n: NFA) {
    const d = DFA.fromNFA(n);
    d.F = d.Q.difference(d.F);

    return this.fromDFA(d);
  }

  static intersection(n1: NFA, n2: NFA) {
    return this.complement(this.union(this.complement(n1), this.complement(n2)));
  }

  static difference(n1: NFA, n2: NFA) {
    return this.complement(this.union(this.complement(n1), n2));
  }

  static symmetricDifference(n1: NFA, n2: NFA) {
    return this.union(this.difference(n1, n2), this.difference(n2, n1));
  }

  static reverse(n: NFA) {
    const m = this.fromDFA(DFA.fromNFA(n));

    const A = m.A;
    const P = m.Q;
    const E = m.F;
    const C = m.D;
    const R = m.S;

    const D = new Map<number, Map<string, Set<number>>>();
    for (const r of P) {
      for (const [sym, [state]] of C.get(r)!.entries()) {
        if (!D.has(state)) D.set(state, new Map());
        if (!D.get(state)!.has(sym)) D.get(state)!.set(sym, new Set());
        D.get(state)!.get(sym)!.add(r);
      }
    }

    const S = this.id++;
    D.set(S, new Map([[EPSILON, E]]));

    const Q = new Set([...P, S]);
    const F = new Set([R]);

    return new NFA(Q, A, S, D, F);
  }

  static fromRegularExpression(A: Set<string>, text: string) {
    const tokenizer = new Lexer(text);
    const tokens = tokenizer.lex();

    if (tokens.length === 1) return this.empty(A); // Empty string

    const parser = new Parser(tokens);
    const AST = parser.parse();

    return AST.visitNFA(A, new NFAVisitor());
  }
}
