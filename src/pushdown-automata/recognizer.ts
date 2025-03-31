import { Hash, Hashable, hashCombine, HashSet, rand64 } from "@/lib/hash";
import { Queue } from "@/lib/queue";
import { CFG, Rule } from "@/pushdown-automata/cfg";

export class Item implements Hashable {
  public constructor(public V: string, public R: Rule, public P: number, public O: number) {}

  static #RND = rand64();

  public hash(): Hash {
    return [this.V, this.R, this.P, this.O].reduce((acc, cur) => hashCombine(acc, cur), Item.#RND);
  }
}

export class Recognizer {
  private cfg: CFG;
  private nullable: HashSet<string> = new HashSet();

  private startItem: Item;
  private stopItem: Item;

  public constructor(c: CFG) {
    this.cfg = c.simplifyAggressive().augmentStart("S`");
    this.nullable = this.cfg.findNullableVariables();

    const [startRule] = this.cfg.P.get(this.cfg.S);

    this.startItem = new Item(this.cfg.S, startRule, 0, 0);
    this.stopItem = new Item(this.cfg.S, startRule, 1, 0);
  }

  public accepts(text: string): boolean {
    const sets = new Array(text.length + 1).fill(null).map(() => new HashSet<Item>());

    sets[0].add(this.startItem);
    for (let i = 0; i <= text.length; ++i) {
      const cur = sets[i];

      const queue = new Queue<Item>(cur);
      while (queue.size > 0) {
        const { V, R, P, O } = queue.pop()!;

        // Scanner
        if (i < text.length && P < R.length) {
          const nxt = sets[i + 1];

          const a = R[P];
          if (this.cfg.T.has(a) && a === text[i]) {
            nxt.add(new Item(V, R, P + 1, O));
          }
        }

        // Predictor
        if (P < R.length) {
          const B = R[P];
          if (this.cfg.V.has(B)) {
            for (const r of this.cfg.P.get(B)) {
              const item = new Item(B, r, 0, i);
              if (cur.has(item)) continue;

              cur.add(item);
              queue.push(item);
            }

            if (this.nullable.has(B)) {
              const item = new Item(V, R, P + 1, O);
              if (cur.has(item)) continue;

              cur.add(item);
              queue.push(item);
            }
          }
        }

        // Completer
        if (P === R.length) {
          for (const { V: U, R: S, P: Q, O: N } of sets[O]) {
            if (Q === S.length) continue;

            const A = S[Q];
            if (A === V) {
              const item = new Item(U, S, Q + 1, N);
              if (cur.has(item)) continue;

              cur.add(item);
              queue.push(item);
            }
          }
        }
      }
    }

    return sets[text.length].has(this.stopItem);
  }
}
