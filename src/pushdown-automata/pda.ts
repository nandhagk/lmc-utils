import { HashMap, HashSet } from "@/lib/hash-map";

export class PDA {
  public constructor(
    public Q: HashSet<number>,
    public A: HashSet<string>,
    public T: HashSet<string>,
    public S: number,
    public D: HashMap<[number, string, string], [number, string]>,
    public F: HashSet<number>
  ) {}
}
