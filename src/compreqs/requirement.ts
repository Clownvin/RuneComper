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

type RequirementsElement =
  | IRequirements
  | {or: Requirements}
  | {and: Requirements};

function handleAndOr<U, V>(
  ele: RequirementsElement,
  {
    req,
    and,
    or,
  }: {
    req: (req: IRequirements) => U;
    and: (reqs: Requirements) => V;
    or: (reqs: Requirements) => V;
  }
) {
  if ('and' in ele) {
    return and(ele.and);
  } else if ('or' in ele) {
    return or(ele.or);
  } else {
    return req(ele);
  }
}

class Requirements {
  protected values: RequirementsElement[];

  constructor(...values: readonly Readonly<RequirementsElement>[]) {
    this.values = values.slice();
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
  get length() {
    return this.values.length;
  }

  add(...values: Readonly<RequirementsElement>[]) {
    this.values.push(...values);
  }

  *[Symbol.iterator]() {
    for (const value of this.values) {
      yield value;
    }
  }

  forEach(iteratee: (req: Readonly<IRequirements>) => unknown): void {
    for (const req of this) {
      handleAndOr(req, {
        and: reqs => reqs.forEach(iteratee),
        or: reqs => reqs.forEach(iteratee),
        req: iteratee,
      });
    }
  }

  reduce<T>(
    mapper: (req: Readonly<IRequirements>) => T,
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
      return reqs.values.reduce(
        (acc, req): T =>
          handleAndOr(req, {
            and: reqs => and(acc, andHelper(reqs)),
            or: reqs => and(acc, orHelper(reqs)),
            req: req => and(acc, mapper(req)),
          }),
        acc
      );
    }
    function orHelper(reqs: Requirements, acc = clone(start)): T {
      return reqs.values.reduce(
        (acc, req): T =>
          handleAndOr(req, {
            and: reqs => or(acc, andHelper(reqs)),
            or: reqs => or(acc, orHelper(reqs)),
            req: req => or(acc, mapper(req)),
          }),
        acc
      );
    }

    return andHelper(this);
  }

  flatten(): IRequirements[] {
    return this.reduce(
      req => [req],
      (a, b) => a.concat(b),
      [] as IRequirements[]
    );
  }

  find<V extends IRequirements = IRequirements>(
    predicate: (req: Readonly<IRequirements>) => req is V
  ): V | undefined;
  find(
    predicate: (req: Readonly<IRequirements>) => boolean
  ): IRequirements | undefined;
  find(predicate: (req: Readonly<IRequirements>) => boolean) {
    for (const value of this) {
      const found = handleAndOr(value, {
        and: reqs => reqs.find(predicate),
        or: reqs => reqs.find(predicate),
        req: req => (predicate(req) ? req : undefined),
      });
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  splice(
    predicate: (reqs: Readonly<RequirementsElement>) => boolean | Requirements,
    replacement?: Requirements
  ): RequirementsElement[] | undefined {
    for (let i = 0; i < this.values.length; i++) {
      const found = predicate(this.values[i]);
      if (!found) {
        continue;
      }
      replacement ??= typeof found === 'boolean' ? new Requirements() : found;
      return this.values.splice(i, 1, ...replacement);
    }
    return undefined;
  }

  remove(predicate: (reqs: Readonly<RequirementsElement>) => boolean): void {
    for (let i = 0; i < this.values.length; i++) {
      const found = predicate(this.values[i]);
      if (!found) {
        continue;
      }
      this.values.splice(i, 1);
      // Go back one, since we just removed index
      i -= 1;
    }
  }
}

export abstract class Requirement<T extends Type = Type>
  extends Requirements
  implements IRequirement
{
  abstract readonly id: RequirementID;
  readonly type: T;
  readonly name: string;
  readonly page: string;

  constructor({
    type,
    name,
    page,
    requirements = [],
  }: {
    type: T;
    name: string;
    page: string;
    requirements?: Readonly<RequirementsElement[]>;
  }) {
    super(...requirements);
    this.type = type;
    this.name = name;
    this.page = page;
  }
}
