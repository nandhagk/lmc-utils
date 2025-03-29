interface Node<T> {
  item: T;
  next: Node<T> | null;
}

export class Queue<T> {
  #head: Node<T> | null = null;
  #tail: Node<T> | null = null;
  #size: number = 0;

  public get size(): number {
    return this.#size;
  }

  public push(x: T): void {
    const node: Node<T> = { item: x, next: null };

    if (this.#head !== null) {
      this.#tail = this.#tail!.next = node;
    } else {
      this.#tail = this.#head = node;
    }

    ++this.#size;
  }

  // UB if called on empty queue
  public pop(): void {
    --this.#size;
    this.#head = this.#head!.next;
  }

  // UB if called on empty queue
  public front(): T {
    return this.#head!.item;
  }
}
