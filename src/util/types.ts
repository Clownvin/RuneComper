export type NonReadonly<T extends {}> = {-readonly [K in keyof T]: T[K]};
