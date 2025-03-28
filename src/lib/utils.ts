import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Iterableify<T> = { [K in keyof T]: Iterable<T[K]> };

export function* product<T extends Array<unknown>>(...iterables: Iterableify<T>): Generator<T> {
  if (iterables.length === 0) return;

  const iterators = iterables.map((it) => it[Symbol.iterator]());
  const results = iterators.map((it) => it.next());

  // Cycle through iterators
  for (let i = 0; ; ) {
    if (results[i].done) {
      // Reset the current iterator
      iterators[i] = iterables[i][Symbol.iterator]();
      results[i] = iterators[i].next();

      // Advance and exit if we've reached the end
      if (++i >= iterators.length) return;
    } else {
      yield results.map(({ value }) => value) as T;
      i = 0;
    }

    results[i] = iterators[i].next();
  }
}
