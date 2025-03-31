import { DefaultHashMap, HashSet } from "@/lib/hash";
import { Queue } from "@/lib/queue";
import { CFG } from "@/pushdown-automata/cfg";
import { Item } from "@/pushdown-automata/recognizer";

export class Generator {
  private cfg: CFG;
  private nullable: HashSet<string> = new HashSet();

  private startItem: Item;
  private stopItem: Item;

  private sets: HashSet<Item>[];

  public constructor(c: CFG) {
    this.cfg = c.simplifyAggressive().augmentStart("S`");
    this.nullable = this.cfg.findNullableVariables();

    const [rule] = this.cfg.P.get(this.cfg.S);

    this.startItem = new Item(this.cfg.S, rule, 0, 0);
    this.stopItem = new Item(this.cfg.S, rule, 1, 0);

    this.sets = [new HashSet([this.startItem])];
  }

  public *generate(length: number): globalThis.Generator<string> {
    const cur = this.sets[this.sets.length - 1];
    const possibleScans = new DefaultHashMap<string, HashSet<Item>>(() => new HashSet());

    const queue = new Queue<Item>(cur);
    while (queue.size > 0) {
      const { V, R, P, O } = queue.pop()!;

      if (P < R.length) {
        const B = R[P];

        if (this.cfg.V.has(B)) {
          for (const r of this.cfg.P.get(B)) {
            const item = new Item(B, r, 0, this.sets.length - 1);
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
        } else if (this.cfg.T.has(B)) {
          possibleScans.get(B).add(new Item(V, R, P + 1, O));
        }
      }

      if (P === R.length) {
        for (const { V: U, R: S, P: Q, O: N } of this.sets[O]) {
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

    if (length === 0) {
      if (cur.has(this.stopItem)) yield "";
      return;
    }

    for (const [scan, items] of possibleScans) {
      this.sets.push(items);
      for (const suf of this.generate(length - 1)) yield scan + suf;

      this.sets.pop();
    }
  }
}
