import { EPSILON } from "@/finite-automata/lexer";
import { DefaultHashMap, HashSet } from "@/lib/hash";

const TOP = "⊤";
const BOT = "⊥";

export class PDA {
  public constructor(
    public Q: HashSet<number>,
    public A: HashSet<string>,
    public T: HashSet<string>,
    public S: number,
    public D: DefaultHashMap<[number, string, string], HashSet<[number, string]>>,
    public F: HashSet<number>
  ) {}

  public static id = 0;

  public static toCFG(p: PDA) {
    const Q = p.Q;
    const A = p.A;
    const T = p.T;
    const R = p.S;
    const E = p.F;
    const C = p.D;

    T.add(TOP);
    T.add(BOT);

    const D = new DefaultHashMap<[number, string, string], HashSet<[number, string]>>(() => new HashSet());

    const S = this.id++;
    Q.add(S);

    D.set([S, EPSILON, EPSILON], new HashSet([[R, TOP]]));

    for (const [[cur, sym, pop], states] of C.entries()) {
      for (const [nxt, push] of states) {
        if (pop !== EPSILON && push !== EPSILON) {
          const mid = this.id++;
          Q.add(mid);

          D.get([cur, sym, pop]).add([mid, EPSILON]);
          D.set([mid, EPSILON, EPSILON], new HashSet([[nxt, push]]));
        } else if (pop === EPSILON && push === EPSILON) {
          const mid = this.id++;
          Q.add(mid);

          D.get([cur, sym, EPSILON]).add([mid, BOT]);
          D.set([mid, EPSILON, BOT], new HashSet([[nxt, EPSILON]]));
        } else {
          D.get([cur, sym, pop]).add([nxt, push]);
        }
      }
    }

    const SP = this.id++;
    Q.add(SP);

    const SS = this.id++;
    Q.add(SS);

    for (const state of E) {
      D.set([state, EPSILON, EPSILON], new HashSet([[SS, BOT]]));
    }

    D.set([SS, EPSILON, BOT], new HashSet([[SP, EPSILON]]));

    for (const pop of T) {
      if (pop === TOP || pop === BOT) continue;

      D.set([SP, EPSILON, pop], new HashSet([[SP, EPSILON]]));
    }

    const AC = this.id++;
    Q.add(AC);

    D.set([SP, EPSILON, TOP], new HashSet([[AC, EPSILON]]));

    const F = new HashSet([AC]);
    return new PDA(Q, A, T, S, D, F);
  }
}
