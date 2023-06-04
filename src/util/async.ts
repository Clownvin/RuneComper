export async function retry<T>(fn: () => Promise<T>, n = 5): Promise<T> {
  try {
    const ret = await fn();
    return ret;
  } catch (err) {
    if (n-- > 0) {
      return retry(fn, n);
    }
    throw err;
  }
}
