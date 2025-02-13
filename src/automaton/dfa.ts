import { NFA } from './nfa.js';
import { EPSILON } from './tokenizer.js';

const setToBigInt = (s: Set<number>) => [...s].reduce((acc, cur) => (acc |= 1n << BigInt(cur)), 0n);

class NDFA {
	constructor(
		public Q: Set<bigint>,
		public A: Set<string>,
		public S: bigint,
		public D: Map<bigint, Map<string, bigint>>,
		public F: Set<bigint>
	) { }

	static fromNFA(n: NFA) {
		const P = n.Q;
		const E = n.F;
		const R = n.S;
		const A = n.A;
		const C = n.D;

		const ER = new Map<number, Set<number>>(P.values().map((r) => [r, new Set([r])]));
		for (const q of P) {
			const stk = [q];

			while (stk.length > 0) {
				const r = stk.pop()!;
				if (!C.has(r) || !C.get(r)!.has(EPSILON)) continue;

				for (const s of C.get(r)!.get(EPSILON)!) {
					if (ER.get(q)!.has(s)) continue;

					ER.get(q)!.add(s);
					stk.push(s);
				}
			}
		}

		const Q = new Set<bigint>();
		const D = new Map<bigint, Map<string, bigint>>();

		const T = ER.get(R)!;
		const S = setToBigInt(T);

		Q.add(S);
		const stk = [T];

		while (stk.length > 0) {
			const q = stk.pop()!;
			const h = setToBigInt(q);

			const G = new Map<string, Set<number>>(A.values().map(a => [a, new Set()]));
			for (const sym of A) {
				for (const r of q) {
					if (!C.has(r) || !C.get(r)!.has(sym)) continue;
					for (const s of C.get(r)!.get(sym)!) {
						G.set(sym, G.get(sym)!.union(ER.get(s)!));
					}
				}
			}

			D.set(h, new Map(G.entries().map(([k, v]) => [k, setToBigInt(v)])));
			for (const s of G.values()) {
				const h = setToBigInt(s);
				if (Q.has(h)) continue;

				Q.add(h);
				stk.push(s);
			}
		}

		const X = E.values().reduce((acc, cur) => acc.union(ER.get(cur)!), new Set<number>());
		const Y = setToBigInt(X);

		const F = new Set(Q.values().filter((q) => (q & Y) != 0n));
		return new NDFA(Q, A, S, D, F);
	}
}

export class DFA {
	constructor(
		public Q: Set<number>,
		public A: Set<string>,
		public S: number,
		public D: Map<number, Map<string, number>>,
		public F: Set<number>
	) { }

	static fromNFA(n: NFA) {
		let id = 0;

		const nd = NDFA.fromNFA(n);
		const P = nd.Q;
		const E = nd.F;
		const R = nd.S;
		const C = nd.D;
		const A = nd.A;

		const M = new Map<bigint, number>();
		for (const p of P) M.set(p, id++);

		const Q = new Set(P.values().map((p) => M.get(p)!));
		const S = M.get(R)!;
		const D = new Map(C.entries().map(([k, v]) => [M.get(k)!, new Map(v.entries().map(([x, y]) => [x, M.get(y)!]))]));
		const F = new Set(E.values().map((e) => M.get(e)!));

		return new DFA(Q, A, S, D, F);
	}

	public findMatch(): string | null {
		const match = new Map<number, string>([[this.S, '']])

		const stk = [this.S]
		while (stk.length > 0) {
			const T = stk.pop()!

			const pref = match.get(T)!
			for (const [sym, state] of this.D.get(T)!) {
				if (match.has(state)) continue

				match.set(state, pref + sym)
				stk.push(state)
			}
		}

		for (const f of this.F)
			if (match.has(f)) return match.get(f)!

		return null
	}
}
