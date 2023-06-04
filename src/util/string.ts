export type UpperFirst<T extends string> =
  T extends `${infer First}${infer Rest}` ? `${Uppercase<First>}${Rest}` : T;

export function upperFirst<T extends string>(string: T): UpperFirst<T> {
  if (!string) {
    return string as UpperFirst<T>;
  }
  return (string[0].toUpperCase() + string.substring(1)) as UpperFirst<T>;
}
