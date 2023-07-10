export class DefaultMap<K, T> extends Map<K, T> {
  constructor(
    protected readonly getDefault: (key: K) => T,
    initial?: ConstructorParameters<typeof Map<K, T>>[0]
  ) {
    super(initial);
  }

  override get(key: K): T {
    let val = super.get(key);
    if (val === undefined) {
      this.set(key, (val = this.getDefault(key)));
    }
    return val;
  }
}

export class CounterMap<K> extends Map<K, number> {
  constructor(initial?: ConstructorParameters<typeof Map<K, number>>[0]) {
    super(initial);
  }

  override get(key: K): number {
    const value = super.get(key);

    if (value === undefined) {
      return 0;
    } else {
      return value;
    }
  }

  add(key: K, count = 1): this {
    this.set(key, this.get(key) + count);
    return this;
  }
}
