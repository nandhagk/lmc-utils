import { DFA } from "@/automaton/dfa";
import { EPSILON } from "@/automaton/tokenizer";

export class GNFA {
  private E = new Map<number, Map<number, string>>();

  constructor(public Q: Set<number>, public A: Set<string>, public S: number, public U: number, public D: Map<number, Map<number, string>>) {
    for (const q of Q) {
      if (!D.has(q)) continue;
      for (const [state, sym] of D.get(q)!) {
        if (!this.E.has(state)) this.E.set(state, new Map());
        this.E.get(state)!.set(q, sym);
      }
    }
  }

  public remove(q: number) {
    let self = this.D.get(q)!.get(q) ?? null;
    if (self !== null) self = `(${self})*`;

    this.D.get(q)!.delete(q);
    this.E.get(q)!.delete(q);

    for (const [incoming, a] of this.E.get(q)!.entries()) {
      for (const [outgoing, b] of this.D.get(q)!.entries()) {
        const c = self ? this.concat(this.concat(a, self), b) : this.concat(a, b);

        if (this.D.get(incoming)!.has(outgoing)) {
          const d = this.D.get(incoming)!.get(outgoing)!;
          this.D.get(incoming)!.set(outgoing, this.union(c, d));

          const e = this.E.get(outgoing)!.get(incoming)!;
          this.E.get(outgoing)!.set(incoming, this.union(c, e));
        } else {
          this.D.get(incoming)!.set(outgoing, c);
          this.E.get(outgoing)!.set(incoming, c);
        }
      }
    }

    for (const outgoing of this.D.get(q)!.keys()) this.E.get(outgoing)!.delete(q);
    for (const incoming of this.E.get(q)!.keys()) this.D.get(incoming)!.delete(q);

    this.Q.delete(q);
    this.D.delete(q);
    this.E.delete(q);
  }

  public removeAll() {
    const Q = this.Q;
    Q.delete(this.S);
    Q.delete(this.U);

    for (const q of Q) this.remove(q);
  }

  public toRegularExpression() {
    this.removeAll();
    return this.D.get(this.S)!.get(this.U) ?? null;
  }

  private union(a: string, b: string) {
    if (a !== EPSILON && b !== EPSILON) return `((${a})|(${b}))`;
    if (a !== EPSILON) return `(${a})?`;
    if (b !== EPSILON) return `(${b})?`;
    return EPSILON;
  }

  private concat(a: string, b: string) {
    if (a !== EPSILON && b !== EPSILON) return a + b;
    if (a !== EPSILON) return a;
    if (b !== EPSILON) return b;
    return EPSILON;
  }

  static fromDFA(d: DFA) {
    const A = d.A;
    const R = d.Q;
    const T = d.S;
    const E = d.F;
    const C = d.D;

    let id = R.size;
    const S = id++;
    const U = id++;

    const Q = new Set([...R, S, U]);
    const D = new Map<number, Map<number, string>>();

    D.set(S, new Map([[T, EPSILON]]));
    for (const q of R) {
      const H = new Map<number, string>();
      for (const a of A) {
        const r = C.get(q)!.get(a)!;
        H.set(r, a);
      }

      if (E.has(q)) H.set(U, EPSILON);
      D.set(q, H);
    }

    return new GNFA(Q, A, S, U, D);
  }
}
