import {clone} from 'lodash';
import {isNonNullish} from './helpers';

export type AndOrElement<T> = T | {or: AndOrMap<T>} | {and: AndOrMap<T>};

export type AndOrIteratee<T, U, V> = {
  val: (req: T) => U;
  and: (reqs: AndOrMap<T>) => V;
  or: (reqs: AndOrMap<T>) => V;
};

function handleAndOr<T, U, V>(
  ele: AndOrElement<T>,
  {val: req, and, or}: AndOrIteratee<T, U, V>
) {
  if (typeof ele === 'object' && isNonNullish(ele)) {
    if ('and' in ele) {
      return and(ele.and);
    } else if ('or' in ele) {
      return or(ele.or);
    }
  }
  return req(ele);
}

export class AndOrMap<T> {
  #values: AndOrElement<T>[];

  constructor(...values: readonly Readonly<AndOrElement<T>>[]) {
    this.#values = values.slice();
  }

  get length() {
    return this.#values.length;
  }

  add(...values: AndOrElement<T>[]) {
    this.#values.push(...values);
  }

  *[Symbol.iterator](): Generator<T, void, unknown> {
    for (const value of this.#values) {
      const val = handleAndOr(value, {
        val: val => val,
        and: values => values[Symbol.iterator](),
        or: values => values[Symbol.iterator](),
      });
      if (typeof val === 'object' && isNonNullish(val) && 'next' in val) {
        for (;;) {
          const next = val.next();
          if (next.done) {
            break;
          }
          yield next.value;
        }
      } else {
        yield val;
      }
    }
  }

  forEach(
    iteratee: ((val: T) => unknown) | AndOrIteratee<T, unknown, unknown>
  ): void {
    const defaultAnd = (reqs: AndOrMap<T>) => reqs.forEach(iteratee);

    iteratee =
      typeof iteratee === 'function'
        ? {val: iteratee, and: defaultAnd, or: defaultAnd}
        : iteratee;

    for (const val of this.#values) {
      handleAndOr(val, iteratee);
    }
  }

  map<MappedT>(
    iteratee:
      | ((val: T) => MappedT)
      | AndOrIteratee<T, MappedT, AndOrElement<MappedT>>
  ): AndOrMap<MappedT> {
    iteratee =
      typeof iteratee === 'function'
        ? {
            val: iteratee,
            and: (values: AndOrMap<T>) => ({and: values.map(iteratee)}),
            or: (values: AndOrMap<T>) => ({or: values.map(iteratee)}),
          }
        : iteratee;

    const map = new AndOrMap<MappedT>();
    for (const val of this.#values) {
      map.add(handleAndOr(val, iteratee));
    }

    return map;
  }

  reduce<MappedT>(
    mapper: (val: T) => MappedT,
    reducer:
      | ((acc: MappedT, val: MappedT) => MappedT)
      | {
          and: (acc: MappedT, val: MappedT) => MappedT;
          or: (acc: MappedT, val: MappedT) => MappedT;
        },
    acc: MappedT
  ): MappedT {
    const start = acc;
    const {and, or} =
      typeof reducer === 'object' ? reducer : {and: reducer, or: reducer};

    function andHelper(values: AndOrMap<T>, acc = clone(start)): MappedT {
      return values.#values.reduce(
        (acc, val): MappedT =>
          handleAndOr(val, {
            and: values => and(acc, andHelper(values)),
            or: values => and(acc, orHelper(values)),
            val: val => and(acc, mapper(val)),
          }),
        acc
      );
    }
    function orHelper(values: AndOrMap<T>, acc = clone(start)): MappedT {
      return values.#values.reduce(
        (acc, val): MappedT =>
          handleAndOr(val, {
            and: values => or(acc, andHelper(values)),
            or: values => or(acc, orHelper(values)),
            val: val => or(acc, mapper(val)),
          }),
        acc
      );
    }

    return andHelper(this);
  }

  flatten(): T[] {
    return this.reduce(
      val => [val],
      (a, b) => a.concat(b),
      [] as T[]
    );
  }

  find<FindT extends T = T>(
    predicate: (val: T) => val is FindT
  ): FindT | undefined;
  find(
    predicate: ((val: T) => boolean) | AndOrIteratee<T, boolean, T | undefined>
  ): T | undefined;
  find(
    predicate: ((val: T) => boolean) | AndOrIteratee<T, boolean, T | undefined>
  ): T | undefined {
    const defaultAnd = (values: AndOrMap<T>) => values.find(predicate);

    const iteratee =
      typeof predicate === 'function'
        ? {
            val: predicate,
            and: defaultAnd,
            or: defaultAnd,
          }
        : predicate;

    for (const val of this.#values) {
      const found = handleAndOr(val, iteratee);
      if (found) {
        return val as T;
      }
    }
    return undefined;
  }

  splice(
    predicate: (values: AndOrElement<T>) => boolean | AndOrMap<T>,
    replacement?: AndOrMap<T>
  ): AndOrElement<T>[] | undefined {
    for (let i = 0; i < this.#values.length; i++) {
      const found = predicate(this.#values[i]);
      if (!found) {
        continue;
      }
      replacement ??= typeof found === 'boolean' ? new AndOrMap() : found;
      return this.#values.splice(i, 1, ...replacement);
    }
    return undefined;
  }

  remove(predicate: (values: AndOrElement<T>) => boolean): void {
    for (let i = 0; i < this.#values.length; i++) {
      const found = predicate(this.#values[i]);
      if (!found) {
        continue;
      }
      this.#values.splice(i, 1);
      // Go back one, since we just removed index
      i -= 1;
    }
  }
}
