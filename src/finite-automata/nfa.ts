import { DFA } from "@/finite-automata/dfa";
import { EPSILON, Lexer } from "@/finite-automata/lexer";
import { NFAVisitor, Parser } from "@/finite-automata/parser";
import { DefaultHashMap, HashMap, HashSet } from "@/lib/hash-map";

export class NFA {
  constructor(
    public Q: HashSet<number>,
    public A: HashSet<string>,
    public S: number,
    public D: DefaultHashMap<[number, string], HashSet<number>>,
    public F: HashSet<number>
  ) {}

  public static id = 0;

  static null(A: HashSet<string>) {
    const S = this.id++;

    const F = new HashSet<number>();
    const Q = new HashSet([S]);

    const D = new DefaultHashMap<[number, string], HashSet<number>>(() => new HashSet());
    return new NFA(Q, A, S, D, F);
  }

  static empty(A: HashSet<string>) {
    const S = this.id++;

    const F = new HashSet([S]);
    const Q = new HashSet([S]);

    const D = new DefaultHashMap<[number, string], HashSet<number>>(() => new HashSet());
    return new NFA(Q, A, S, D, F);
  }

  static literal(A: HashSet<string>, sym: string) {
    const S = this.id++;
    const E = this.id++;

    const F = new HashSet([E]);
    const Q = new HashSet([S, E]);

    const D = new DefaultHashMap<[number, string], HashSet<number>>(() => new HashSet(), [[[S, sym], F]]);
    return new NFA(Q, A, S, D, F);
  }

  static union(n1: NFA, n2: NFA) {
    const S = this.id++;

    const A = new HashSet([...n1.A, ...n2.A]);
    const Q = new HashSet([...n1.Q, ...n2.Q, S]);
    const F = new HashSet([...n1.F, ...n2.F]);

    const D = new DefaultHashMap<[number, string], HashSet<number>>(
      () => new HashSet(),
      [...n1.D, ...n2.D, [[S, EPSILON], new HashSet([n1.S, n2.S])]]
    );
    return new NFA(Q, A, S, D, F);
  }

  static concatenate(n1: NFA, n2: NFA) {
    const S = n1.S;
    const T = n2.S;
    const E = n1.F;
    const F = n2.F;

    const A = new HashSet([...n1.A, ...n2.A]);
    const Q = new HashSet([...n1.Q, ...n2.Q]);
    const D = new DefaultHashMap<[number, string], HashSet<number>>(() => new HashSet(), [...n1.D, ...n2.D]);

    for (const f of E) D.get([f, EPSILON]).add(T);
    return new NFA(Q, A, S, D, F);
  }

  static star(n: NFA) {
    const T = n.S;
    const A = n.A;
    const E = n.F;
    const D = n.D;

    const S = this.id++;

    const Q = new HashSet([...n.Q, S]);
    const F = new HashSet([...E, S]);

    D.set([S, EPSILON], new HashSet([T]));
    for (const f of E) D.get([f, EPSILON]).add(T);

    return new NFA(Q, A, S, D, F);
  }

  static fromDFA(d: DFA) {
    const A = d.A;
    const R = d.Q;
    const T = d.S;
    const E = d.F;
    const C = d.D;

    const M = new HashMap<number, number>();
    for (const r of R) M.set(r, this.id++);

    const Q = new HashSet(R.values().map((r) => M.get(r)!));
    const S = M.get(T)!;
    const F = new HashSet(E.values().map((e) => M.get(e)!));

    const D = new DefaultHashMap<[number, string], HashSet<number>>(
      () => new HashSet(),
      C.entries().map(([[k, x], v]) => [[M.get(k)!, x], new HashSet([M.get(v)!])])
    );

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

    const D = new DefaultHashMap<[number, string], HashSet<number>>(() => new HashSet());
    for (const r of P) {
      for (const sym of A) {
        const [state] = C.get([r, sym])!;
        D.get([state, sym])!.add(r);
      }
    }

    const S = this.id++;
    D.set([S, EPSILON], E);

    const Q = new HashSet([...P, S]);
    const F = new HashSet([R]);

    return new NFA(Q, A, S, D, F);
  }

  static fromRegularExpression(A: HashSet<string>, text: string) {
    const tokenizer = new Lexer(text);
    const tokens = tokenizer.lex();

    if (tokens.length === 1) return this.empty(A); // Empty string

    const parser = new Parser(tokens);
    const AST = parser.parse();

    return AST.visitNFA(A, new NFAVisitor());
  }
}
