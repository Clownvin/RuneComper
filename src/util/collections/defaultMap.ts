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
