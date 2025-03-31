interface Node<T> {
  item: T;
  next: Node<T> | null;
}

export class Queue<T> {
  #head: Node<T> | null = null;
  #tail: Node<T> | null = null;
  #size: number = 0;

  public constructor(other?: Iterable<T>) {
    if (other !== undefined) {
      for (const item of other) this.push(item);
    }
  }

  public get size(): number {
    return this.#size;
  }

  public push(item: T): void {
    const node: Node<T> = { item, next: null };

    if (this.#head !== null) {
      this.#tail = this.#tail!.next = node;
    } else {
      this.#tail = this.#head = node;
    }

    ++this.#size;
  }

  public pop(): T | undefined {
    const item = this.peek();

    if (this.#head !== null) {
      this.#head = this.#head.next;
      --this.#size;
    }

    return item;
  }

  public peek(): T | undefined {
    return this.#head?.item;
  }
}
