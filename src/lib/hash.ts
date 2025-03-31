export type Hash = bigint;

const rand16 = (): Hash => BigInt(Math.floor(Math.random() * (1 << 16)));
const rand32 = (): Hash => (rand16() << 16n) | rand16();
export const rand64 = (): Hash => (rand32() << 32n) | rand32();

const RAND_UND = rand64();
const RAND_NIL = rand64();
const RAND_BNT = rand64();
const RAND_INT = rand64();
const RAND_BOL = rand64();
const RAND_STR = rand64();
const RAND_ARR = rand64();
const RAND_OBJ = rand64();

export interface Hashable {
  hash(): Hash;
}

const isHashable = (key: NonNullable<unknown>): key is Hashable => typeof key === "object" && "hash" in key;

const hashInt = (seed: Hash, key: bigint): Hash => {
  key += 0x9e3779b97f4a7c15n + seed;
  key = (key ^ (key >> 30n)) * 0xbf58476d1ce4e5b9n;
  key = (key ^ (key >> 27n)) * 0x94d049bb133111ebn;

  return BigInt.asUintN(64, key ^ (key >> 31n));
};

const isInteger = (key: unknown): key is number => Number.isSafeInteger(key);

export const hashCombine = (seed: Hash, key: unknown): Hash =>
  BigInt.asUintN(64, seed ^ (hash(key) + 0x9e3779b97f4a7c15n + (seed << 12n) + (seed >> 4n)));

const hash = (key: unknown): Hash => {
  if (key === undefined) return RAND_UND;
  if (key === null) return RAND_NIL;

  if (isHashable(key)) return key.hash();

  if (typeof key === "bigint") return hashInt(RAND_BNT, key);
  if (isInteger(key)) return hashInt(RAND_INT, BigInt(key));
  if (typeof key === "boolean") return hashInt(RAND_BOL, BigInt(key));

  if (typeof key === "string") return [...key].reduce((acc, cur) => hashCombine(acc, cur.codePointAt(0)), RAND_STR);
  if (Array.isArray(key)) return key.reduce((acc, cur) => hashCombine(acc, cur), RAND_ARR);

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
export class HashMap<K, V> implements Hashable {
  #keys = new Map<Hash, K>();
  #vals = new Map<Hash, V>();

  public constructor(entries?: Iterable<[K, V]>) {
    if (entries !== undefined) {
      for (const [key, val] of entries) this.set(key, val);
    }
  }

  public get size(): number {
    return this.#keys.size;
  }

  public clear(): void {
    this.#keys.clear();
    this.#vals.clear();
  }

  public get(key: K): V | undefined {
    return this.#vals.get(hash(key));
  }

  public has(key: K): boolean {
    return this.#keys.has(hash(key));
  }

  public set(key: K, val: V): HashMap<K, V> {
    const k = hash(key);
    this.#keys.set(k, key);
    this.#vals.set(k, val);

    return this;
  }

  public delete(key: K): boolean {
    const k = hash(key);
    return this.#keys.delete(k) && this.#vals.delete(k);
  }

  public keys(): MapIterator<K> {
    return this.#keys.values();
  }

  public values(): MapIterator<V> {
    return this.#vals.values();
  }

  public entries(): MapIterator<[K, V]> {
    return new HashMapEntriesIterator(this.#keys.values(), this.#vals.values());
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries();
  }

  static #RND = rand64();

  public hash(): Hash {
    return [...this.#vals.entries()].toSorted().reduce((acc, cur) => hashCombine(acc, cur), HashMap.#RND);
  }
}

// DO NOT mutate while iterating
export class HashSet<V> implements Hashable {
  #vals = new Map<Hash, V>();

  public constructor(vals?: Iterable<V>) {
    if (vals !== undefined) {
      for (const val of vals) this.add(val);
    }
  }

  public get size(): number {
    return this.#vals.size;
  }

  public clear(): void {
    this.#vals.clear();
  }

  public add(val: V): HashSet<V> {
    this.#vals.set(hash(val), val);

    return this;
  }

  public has(val: V): boolean {
    return this.#vals.has(hash(val));
  }

  public delete(val: V): boolean {
    return this.#vals.delete(hash(val));
  }

  public values(): MapIterator<V> {
    return this.#vals.values();
  }

  [Symbol.iterator](): MapIterator<V> {
    return this.values();
  }

  public union(other: Iterable<V>): HashSet<V> {
    return new HashSet([...this.values(), ...other]);
  }

  public difference(other: Iterable<V>): HashSet<V> {
    const s = new HashSet(this.values());

    for (const val of other) {
      if (this.has(val)) s.delete(val);
    }

    return s;
  }

  public intersection(other: Iterable<V>): HashSet<V> {
    const s = new HashSet<V>();

    for (const val of other) {
      if (this.has(val)) s.add(val);
    }

    return s;
  }

  public isDisjointFrom(other: Iterable<V>): boolean {
    for (const val of other) {
      if (this.has(val)) return false;
    }

    return true;
  }

  public isSubsetOf(other: Iterable<V>): boolean {
    const s = new HashSet(this.values());

    for (const val of other) {
      if (s.has(val)) s.delete(val);
    }

    return s.size === 0;
  }

  public isSupersetOf(other: Iterable<V>): boolean {
    for (const val of other) {
      if (!this.has(val)) return false;
    }

    return true;
  }

  public isEqual(other: Iterable<V>): boolean {
    const s = new HashSet(this.values());

    for (const val of other) {
      if (!s.has(val)) return false;
      s.delete(val);
    }

    return s.size === 0;
  }

  public symmetricDifference(other: Iterable<V>): HashSet<V> {
    const s = new HashSet(this.values());
    const t = new HashSet<V>();

    for (const val of other) {
      if (!s.has(val)) t.add(val);
      s.delete(val);
    }

    return new HashSet([...s, ...t]);
  }

  static #RND = rand64();

  public hash(): Hash {
    return [...this.#vals.keys()].toSorted().reduce((acc, cur) => hashCombine(acc, cur), HashSet.#RND);
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
