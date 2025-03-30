import { DefaultHashMap, HashSet } from "@/lib/hash";
import { Queue } from "@/lib/queue";
import { CFG, Rule } from "@/pushdown-automata/cfg";

interface Item {
  variable: string;
  rule: Rule;
  position: number;
  pointer: number;
}

export class Recognizer {
  private cfg: CFG;
  private nullable: HashSet<string> = new HashSet();

  public constructor(c: CFG) {
    c = c.simplifyAggressive();

    const T = c.T;
    const U = c.V;
    const R = c.S;
    const O = c.P;

    const S = "S`";

    const V = new HashSet([S, ...U]);
    const P = new DefaultHashMap<string, HashSet<Rule>>(() => new HashSet(), O);

    P.set(S, new HashSet([[R]]));

    this.cfg = new CFG(T, V, S, P);
    this.nullable = this.cfg.findNullableVariables();
  }

  public accepts(text: string): boolean {
    const sets = new Array(text.length + 1).fill(null).map(() => new HashSet<Item>());
    const startRule = [...this.cfg.P.get(this.cfg.S)][0];

    sets[0].add({ variable: this.cfg.S, rule: startRule, position: 0, pointer: 0 });
    for (let i = 0; i <= text.length; ++i) {
      const cur = sets[i];

      const queue = new Queue<Item>();
      for (const item of cur) queue.push(item);

      while (queue.size > 0) {
        const { variable, rule, position, pointer } = queue.front();
        queue.pop();

        // Scanner
        if (i < text.length && position < rule.length) {
          const nxt = sets[i + 1];
          const a = rule[position];

          if (this.cfg.T.has(a) && a === text[i]) {
            const item = { variable, rule, position: position + 1, pointer };
            if (nxt.has(item)) continue;

            nxt.add(item);
          }
        }

        // Predictor
        if (position < rule.length) {
          const B = rule[position];
          if (this.cfg.V.has(B)) {
            for (const r of this.cfg.P.get(B)) {
              const item = { variable: B, rule: r, position: 0, pointer: i };
              if (cur.has(item)) continue;

              cur.add(item);
              queue.push(item);
            }

            if (this.nullable.has(B)) {
              const item = { variable, rule, position: position + 1, pointer };
              if (cur.has(item)) continue;

              cur.add(item);
              queue.push(item);
            }
          }
        }

        // Completer
        if (position === rule.length) {
          for (const { variable: v, rule: r, position: p, pointer: ptr } of sets[pointer]) {
            if (p < r.length) {
              const A = r[p];
              if (A === variable) {
                const item = { variable: v, rule: r, position: p + 1, pointer: ptr };
                if (cur.has(item)) continue;

                cur.add(item);
                queue.push(item);
              }
            }
          }
        }
      }
    }

    const item = { variable: this.cfg.S, rule: startRule, position: 1, pointer: 0 };
    return sets[text.length].has(item);
  }
}
