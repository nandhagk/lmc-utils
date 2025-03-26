const rand16 = () => BigInt(Math.floor(Math.random() * (1 << 16)));
const rand32 = () => (rand16() << 16n) | rand16();
const rand64 = () => (rand32() << 32n) | rand32();

const hasHashCode = (key: NonNullable<unknown>): key is object & { hashCode: () => bigint } => typeof key === "object" && "hashCode" in key;

const RAND_NUM = rand64();
const RAND_ARR = rand64();
const RAND_STR = rand64();
const RAND_OBJ = rand64();
const RAND_NIL = rand64();
const RAND_UND = rand64();
const RAND_HMP = rand64();
const RAND_HST = rand64();

const hashCombine = (seed: bigint, key: unknown) => BigInt.asUintN(64, seed ^ (hash(key) + 0x9e3779b97f4a7c15n + (seed << 12n) + (seed >> 4n)));

export const hash = (key: unknown): bigint => {
  if (key === undefined) return RAND_UND;
  if (key === null) return RAND_NIL;

  if (typeof key === "string") {
    let k = RAND_STR;

    for (const char of key) k = hashCombine(k, char.codePointAt(0));
    return k;
  }

  if (typeof key === "number" || typeof key === "bigint" || typeof key === "boolean") {
    let k = BigInt(key);

    k += 0x9e3779b97f4a7c15n + RAND_NUM;
    k = (k ^ (k >> 30n)) * 0xbf58476d1ce4e5b9n;
    k = (k ^ (k >> 27n)) * 0x94d049bb133111ebn;

    return BigInt.asUintN(64, k ^ (k >> 31n));
  }

  if (Array.isArray(key)) return key.reduce((acc, cur) => hashCombine(acc, cur), RAND_ARR);

  if (hasHashCode(key)) return key.hashCode();
  if (typeof key === "object")
    return Object.entries(key)
      .map((x) => hash(x))
      .toSorted()
      .reduce((acc, cur) => hashCombine(acc, cur), RAND_OBJ);

  throw new Error(`Couldn't hash ${key}`);
};

class HashMapEntriesIterator<K, V> extends Iterator<[K, V]> {
  #keys: MapIterator<K>;
  #vals: MapIterator<V>;

  public constructor(keys: MapIterator<K>, vals: MapIterator<V>) {
    super();

    this.#keys = keys;
    this.#vals = vals;
  }

  static {
    Object.defineProperty(this.prototype, Symbol.toStringTag, {
      value: "Hash Map Entries Iterator",
      configurable: true,
      enumerable: false,
      writable: false,
    });
  }

  public next(): IteratorResult<[K, V], undefined> {
    const key = this.#keys.next();
    const val = this.#vals.next();

    if (!key.done && !val.done) return { value: [key.value, val.value], done: false };
    return { value: undefined, done: true };
  }
}

// DO NOT mutate while iterating
export class HashMap<K, V> {
  #keys = new Map<bigint, K>();
  #vals = new Map<bigint, V>();

  public constructor(entries?: Iterable<[K, V]>) {
    if (entries !== undefined) {
      for (const [key, val] of entries) this.set(key, val);
    }
  }

  public get size() {
    return this.#keys.size;
  }

  public clear() {
    this.#keys.clear();
    this.#vals.clear();
  }

  public get(key: K) {
    return this.#vals.get(hash(key));
  }

  public has(key: K) {
    return this.#keys.has(hash(key));
  }

  public set(key: K, val: V) {
    const k = hash(key);
    this.#keys.set(k, key);
    this.#vals.set(k, val);
  }

  public delete(key: K) {
    const k = hash(key);
    return this.#keys.delete(k) && this.#vals.delete(k);
  }

  public keys() {
    return this.#keys.values();
  }

  public values() {
    return this.#vals.values();
  }

  public entries() {
    return new HashMapEntriesIterator(this.#keys.values(), this.#vals.values());
  }

  [Symbol.iterator]() {
    return this.entries();
  }

  public hashCode() {
    return [...this.#vals.entries()].toSorted().reduce((acc, cur) => hashCombine(acc, cur), RAND_HMP);
  }
}

// DO NOT mutate while iterating
export class HashSet<V> {
  #vals = new Map<bigint, V>();

  public constructor(vals?: Iterable<V>) {
    if (vals !== undefined) {
      for (const val of vals) this.add(val);
    }
  }

  public get size() {
    return this.#vals.size;
  }

  public clear() {
    this.#vals.clear();
  }

  public add(val: V) {
    this.#vals.set(hash(val), val);
  }

  public has(val: V) {
    return this.#vals.has(hash(val));
  }

  public delete(val: V) {
    return this.#vals.delete(hash(val));
  }

  public values() {
    return this.#vals.values();
  }

  [Symbol.iterator]() {
    return this.values();
  }

  public union(other: Iterable<V>) {
    return new HashSet([...this.values(), ...other]);
  }

  public difference(other: Iterable<V>) {
    const s = new HashSet([...this.values()]);

    for (const val of other) {
      if (this.has(val)) s.delete(val);
    }

    return s;
  }

  public intersection(other: Iterable<V>) {
    const s = new HashSet<V>();

    for (const val of other) {
      if (this.has(val)) s.add(val);
    }

    return s;
  }

  public isDisjointFrom(other: Iterable<V>) {
    for (const val of other) {
      if (this.has(val)) return false;
    }

    return true;
  }

  public hashCode() {
    return [...this.#vals.keys()].toSorted().reduce((acc, cur) => hashCombine(acc, cur), RAND_HST);
  }
}

export class DefaultHashMap<K, V> extends HashMap<K, V> {
  #gen: () => V;

  public constructor(gen: () => V, entries?: Iterable<[K, V]>) {
    super(entries);

    this.#gen = gen;
  }

  public get(key: K): V {
    if (!super.has(key)) super.set(key, this.#gen());
    return super.get(key)!;
  }
}
