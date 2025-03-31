import { EPSILON } from "@/finite-automata/lexer";
import { NFA } from "@/finite-automata/nfa";
import { DefaultHashMap, HashMap, HashSet } from "@/lib/hash";

class NDFA {
  public constructor(
    public Q: HashSet<HashSet<number>>,
    public A: HashSet<string>,
    public S: HashSet<number>,
    public D: HashMap<[HashSet<number>, string], HashSet<number>>,
    public F: HashSet<HashSet<number>>
  ) {}

  public static fromNFA(n: NFA): NDFA {
    const P = n.Q;
    const E = n.F;
    const R = n.S;
    const A = n.A;
    const C = n.D;

    const ER = new HashMap<number, HashSet<number>>(P.values().map((r) => [r, new HashSet([r])]));

    for (const q of P) {
      const stk = [q];

      while (stk.length > 0) {
        const r = stk.pop()!;
        for (const s of C.get([r, EPSILON])) {
          if (ER.get(q)!.has(s)) continue;

          ER.get(q)!.add(s);
          stk.push(s);
        }
      }
    }

    const Q = new HashSet<HashSet<number>>();
    const D = new HashMap<[HashSet<number>, string], HashSet<number>>();

    const S = ER.get(R)!;

    Q.add(S);
    const stk = [S];

    while (stk.length > 0) {
      const q = stk.pop()!;

      const G = new DefaultHashMap<[HashSet<number>, string], HashSet<number>>(() => new HashSet<number>());
      for (const r of q) {
        for (const sym of A) {
          for (const s of C.get([r, sym])) {
            G.set([q, sym], G.get([q, sym]).union(ER.get(s)!));
          }
        }
      }

      for (const [k, s] of G) {
        D.set(k, s);
        if (Q.has(s)) continue;

        Q.add(s);
        stk.push(s);
      }
    }

    const Y = E.values().reduce((acc, cur) => acc.union(ER.get(cur)!), new HashSet<number>());
    const F = new HashSet(Q.values().filter((q) => !Y.isDisjointFrom(q)));

    return new NDFA(Q, A, S, D, F);
  }
}

export class DFA {
  public constructor(
    public Q: HashSet<number>,
    public A: HashSet<string>,
    public S: number,
    public D: HashMap<[number, string], number>,
    public F: HashSet<number>
  ) {}

  public static fromNFA(n: NFA): DFA {
    let id = 0;

    const nd = NDFA.fromNFA(n);

    const P = nd.Q;
    const E = nd.F;
    const R = nd.S;
    const C = nd.D;
    const A = nd.A;

    const M = new HashMap<HashSet<number>, number>();
    for (const p of P) M.set(p, id++);

    const Q = new HashSet(P.values().map((p) => M.get(p)!));
    const S = M.get(R)!;
    const D = new HashMap<[number, string], number>(C.entries().map(([[k, x], v]) => [[M.get(k)!, x], M.get(v)!]));
    const F = new HashSet(E.values().map((e) => M.get(e)!));

    return new DFA(Q, A, S, D, F);
  }

  public findMatch(): string | null {
    const match = new HashMap<number, string>([[this.S, ""]]);

    const stk = [this.S];
    while (stk.length > 0) {
      const T = stk.pop()!;

      const pref = match.get(T)!;
      for (const sym of this.A) {
        const state = this.D.get([T, sym])!;
        if (match.has(state)) continue;

        match.set(state, pref + sym);
        stk.push(state);
      }
    }

    for (const f of this.F) {
      if (match.has(f)) return match.get(f)!;
    }

    return null;
  }

  public accepts(test: string): boolean {
    if (!this.A.isSupersetOf(test)) return false;

    let cur = this.S;
    for (const sym of test) {
      cur = this.D.get([cur, sym])!;
    }

    return this.F.has(cur);
  }
}
