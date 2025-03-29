import { EPSILON } from "@/finite-automata/lexer";
import { HashSet } from "@/lib/hash";
import { Queue } from "@/lib/queue";
import { CFG } from "@/pushdown-automata/cfg";

interface Item {
  variable: string;
  rule: string[];
  position: number;
  pointer: number;
}

export class Parser {
  private nullable: HashSet<string> = new HashSet();

  // simplify cfg before passing
  public constructor(public cfg: CFG) {
    const [s] = cfg.variables;
    const start = "S`";

    cfg.variables = new HashSet([start, ...cfg.variables]);
    cfg.productions.set(start, new HashSet([[s]]));

    this.nullable.add(EPSILON);
    for (;;) {
      const entry = cfg.productions
        .entries()
        .filter(([variable]) => !this.nullable.has(variable))
        .find(([, rules]) => rules.values().find((rule) => this.nullable.isSupersetOf(rule)));
      if (entry === undefined) break;

      const [variable] = entry;
      this.nullable.add(variable);
    }

    this.nullable.delete(EPSILON);
  }

  public accepts(text: string): boolean {
    const sets = new Array(text.length + 1).fill(null).map(() => new HashSet<Item>());

    const [start] = this.cfg.variables;
    const [s] = [...this.cfg.productions.get(start)][0];

    sets[0].add({ variable: start, rule: [s], position: 0, pointer: 0 });
    for (let i = 0; i <= text.length; ++i) {
      const queue = new Queue<Item>();
      for (const item of sets[i]) queue.push(item);

      while (queue.size > 0) {
        const { variable, rule, position, pointer } = queue.front();
        queue.pop();

        // Scanner
        if (i < text.length && position < rule.length) {
          const a = rule[position];

          if (this.cfg.alphabet.has(a) && a === text[i]) {
            const item = { variable, rule, position: position + 1, pointer };
            if (sets[i + 1].has(item)) continue;

            sets[i + 1].add(item);
          }
        }

        // Predictor
        if (position < rule.length) {
          const B = rule[position];
          if (this.cfg.variables.has(B)) {
            for (const r of this.cfg.productions.get(B)) {
              const item = { variable: B, rule: r, position: 0, pointer: i };
              if (sets[i].has(item)) continue;

              sets[i].add(item);
              queue.push(item);
            }

            if (this.nullable.has(B)) {
              const item = { variable, rule, position: position + 1, pointer };
              if (sets[i].has(item)) continue;

              sets[i].add(item);
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
                if (sets[i].has(item)) continue;

                sets[i].add(item);
                queue.push(item);
              }
            }
          }
        }
      }
    }

    const item = { variable: start, rule: [s], position: 1, pointer: 0 };
    return sets[text.length].has(item);
  }
}
