import {clone} from 'lodash';
import {Skill} from '../model/runescape';

export type Type = 'quest' | 'skill' | 'achievement';

export interface IRequirement {
  readonly name: string;
  readonly page: string;
  readonly type: Type;
}

export interface IAchievement extends IRequirement {
  readonly type: 'achievement';
}

export interface IQuest extends IRequirement {
  readonly type: 'quest';
  readonly miniquest: boolean;
}

export interface IQuestRequired extends IQuest {
  readonly required: boolean;
}

export interface ISkill extends IRequirement {
  readonly type: 'skill';
  readonly name: Skill;
  readonly level: number;
}

export type RequirementID = ReturnType<typeof getRequirementID>;

export function getRequirementID(req: IAchievement | IQuest | ISkill) {
  const normalId = `${req.type}:${req.page.split('/w/').pop()!}` as const;
  if (req.type === 'skill') {
    return `${normalId}:${req.level}` as const;
  } else {
    return normalId;
  }
}

type IRequirements = IAchievement | IQuestRequired | ISkill;

export function isSkill(req: IRequirements): req is ISkill {
  return req.type === 'skill';
}

export function isQuest(req: IRequirements): req is IQuestRequired {
  return req.type === 'quest';
}

export function isAchievement(req: IRequirements): req is IAchievement {
  return req.type === 'achievement';
}

type RequirementsElement<T> =
  | T
  | {or: Requirements<RequirementsElement<T>>}
  | {and: Requirements<RequirementsElement<T>>};

class Requirements<
  V = IRequirements,
  T extends RequirementsElement<V> = RequirementsElement<V>
> extends Array<T> {}

class ReadonlyRequirements extends Requirements<
  | Readonly<IRequirements>
  | {or: ReadonlyRequirements}
  | {and: ReadonlyRequirements}
> {}

class MappedRequirements<T> extends Requirements<
  T | {or: MappedRequirements<T>} | {and: MappedRequirements<T>}
> {}

export abstract class Requirement<T extends Type = Type>
  implements IRequirement
{
  abstract readonly id: RequirementID;
  readonly type: T;
  readonly name: string;
  readonly page: string;
  #requirements: Requirements;

  constructor({
    type,
    name,
    page,
    requirements = [],
  }: {
    type: T;
    name: string;
    page: string;
    requirements?: Requirements;
  }) {
    this.type = type;
    this.name = name;
    this.page = page;
    this.#requirements = requirements;
  }

  add(...reqs: ReadonlyRequirements): void {
    for (const req of reqs) {
      this.#requirements.push(req as Requirements[number]);
    }
  }

  forEach(iteratee: (req: IRequirements) => unknown): void {
    function helper(reqs: Requirements) {
      for (const req of reqs) {
        if ('and' in req) {
          helper(req.and);
        } else if ('or' in req) {
          helper(req.or);
        } else {
          iteratee(req);
        }
      }
    }
    helper(this.#requirements);
  }

  map<T>(iteratee: (req: IRequirements) => T): MappedRequirements<T> {
    function helper(reqs: Requirements, map: MappedRequirements<T> = []) {
      for (const req of reqs) {
        if ('and' in req) {
          map.push({and: helper(req.and)});
        } else if ('or' in req) {
          map.push({or: helper(req.or)});
        } else {
          map.push(iteratee(req));
        }
      }
      return map;
    }

    return helper(this.#requirements);
  }

  reduce<T>(
    mapper: (req: IRequirements) => T,
    reducer:
      | ((acc: T, req: T) => T)
      | {
          and: (acc: T, req: T) => T;
          or: (acc: T, req: T) => T;
        },
    acc: T
  ): T {
    const start = acc;
    const {and, or} =
      typeof reducer === 'object' ? reducer : {and: reducer, or: reducer};

    function andHelper(reqs: Requirements, acc = clone(start)): T {
      return reqs.reduce((acc, req): T => {
        if ('and' in req) {
          return and(acc, andHelper(req.and));
        } else if ('or' in req) {
          return and(acc, orHelper(req.or));
        } else {
          return and(acc, mapper(req));
        }
      }, acc);
    }
    function orHelper(reqs: Requirements, acc = clone(start)): T {
      return reqs.reduce((acc, req): T => {
        if ('and' in req) {
          return or(acc, andHelper(req.and));
        } else if ('or' in req) {
          return or(acc, orHelper(req.or));
        } else {
          return or(acc, mapper(req));
        }
      }, acc);
    }

    return andHelper(this.#requirements);
  }

  flatten(): IRequirements[] {
    return this.reduce(
      req => [req],
      (a, b) => a.concat(b),
      [] as IRequirements[]
    );
  }

  splice(
    predicate: (reqs: ReadonlyRequirements[number]) => boolean | Requirements,
    replacement?: Requirements
  ): RequirementsElement<IRequirements>[] | undefined {
    for (let i = 0; i < this.#requirements.length; i++) {
      const found = predicate(this.#requirements[i]);
      if (!found) {
        continue;
      }
      replacement ??= typeof found === 'boolean' ? [] : found;
      return this.#requirements.splice(i, 1, ...replacement);
    }
    return undefined;
  }

  remove(predicate: (reqs: ReadonlyRequirements[number]) => boolean): void {
    for (let i = 0; i < this.#requirements.length; i++) {
      const found = predicate(this.#requirements[i]);
      if (!found) {
        continue;
      }
      this.#requirements.splice(i, 1);
      // Go back one, since we just removed index
      i -= 1;
    }
  }

  get requirements(): ReadonlyRequirements {
    return this.#requirements;
  }

  get skills(): ISkill[] {
    return this.flatten().filter(isSkill);
  }

  get quests(): IQuestRequired[] {
    return this.flatten().filter(isQuest);
  }

  get achievements(): IAchievement[] {
    return this.flatten().filter(isAchievement);
  }
}
