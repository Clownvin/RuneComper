import {Moment} from 'moment';
import {Skill} from '../model/runescape';
import {AndOrElement, AndOrMap} from '../util/collections/andOrMap';

export type Type = 'quest' | 'skill' | 'achievement' | 'combat';

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

export interface ISkill extends IRequirement {
  readonly type: 'skill';
  readonly name: Skill;
  readonly level: number;
}

export interface ISKillBoostable extends ISkill {
  readonly boostable: boolean;
}

export interface ICombatLevel extends IRequirement {
  readonly name: 'Combat';
  readonly type: 'combat';
  readonly level: number;
}

export type RequirementID = ReturnType<typeof getRequirementID>;

export function getRequirementID(
  req: IAchievement | IQuest | ISkill | ICombatLevel
) {
  const normalId = `${req.type}:${req.page.split('/w/').pop()!}` as const;
  if (req.type === 'skill' || req.type === 'combat') {
    return `${normalId}:${req.level}` as const;
  } else {
    return normalId;
  }
}

export type IRequirements =
  | IAchievement
  | IQuest
  | ISKillBoostable
  | ICombatLevel;

export function isSkill(req: IRequirements): req is ISKillBoostable {
  return req.type === 'skill';
}

export function isQuest(req: IRequirements): req is IQuest {
  return req.type === 'quest';
}

export function isAchievement(req: IRequirements): req is IAchievement {
  return req.type === 'achievement';
}

export abstract class Requirement<T extends Type = Type>
  implements IRequirement
{
  abstract readonly id: RequirementID;
  readonly type: T;
  readonly name: string;
  readonly icon: string;
  readonly page: string;
  readonly released: Moment;

  readonly required: AndOrMap<IRequirements>;
  readonly recommended: AndOrMap<IRequirements>;

  constructor({
    type,
    name,
    page,
    icon,
    released,
    required = [],
    recommended = [],
  }: {
    type: T;
    name: string;
    page: string;
    icon: string;
    released: Moment;
    required?: Readonly<AndOrElement<IRequirements>[]>;
    recommended?: Readonly<AndOrElement<IRequirements>[]>;
  }) {
    this.type = type;
    this.name = name;
    this.page = page;
    this.icon = icon;
    this.released = released;
    this.required = new AndOrMap(...required);
    this.recommended = new AndOrMap(...recommended);
  }

  addRequired(...parameters: Parameters<Requirement['required']['add']>) {
    this.required.add(...parameters);
  }

  addRecommended(...parameters: Parameters<Requirement['required']['add']>) {
    this.recommended.add(...parameters);
  }

  protected includeRecommended<T>(
    fn: (req: Requirement['required'], required: boolean) => T,
    merge: (a: T, b: () => T) => T,
    recommended: boolean
  ) {
    const required = fn(this.required, true);
    if (recommended) {
      return merge(required, () => fn(this.recommended, false));
    }
    return required;
  }

  find<FindT extends IRequirements>(
    fn: (req: IRequirements, required: boolean) => req is FindT,
    recommended?: boolean
  ): ReturnType<Requirement['required']['find']>;
  find(
    fn: (req: IRequirements, required: boolean) => boolean,
    recommended?: boolean
  ): ReturnType<Requirement['required']['find']>;
  find(
    fn: (req: IRequirements, required: boolean) => boolean,
    recommended = true
  ): ReturnType<Requirement['required']['find']> {
    return this.includeRecommended(
      (reqs, required) => reqs.find(req => fn(req, required)),
      (a, b) => a ?? b(),
      recommended
    );
  }

  forEach(
    fn: (req: IRequirements, required: boolean) => unknown,
    recommended = true
  ) {
    return this.includeRecommended(
      (reqs, required) => reqs.forEach(req => fn(req, required)),
      (_, b) => b(),
      recommended
    );
  }

  map<T>(fn: (req: IRequirements, required: boolean) => T, recommended = true) {
    return this.includeRecommended(
      (reqs, required) => reqs.map(req => fn(req, required)),
      (a, b) => {
        a.add(b());
        return a;
      },
      recommended
    );
  }

  protected filterByType<T extends IRequirements>(
    fn: (req: IRequirements) => req is T,
    recommended: boolean
  ): T[] {
    return this.includeRecommended(
      reqs => reqs.flatten().filter(fn),
      (a, b) => a.concat(b()),
      recommended
    );
  }

  getSkills(recommended = true): ISKillBoostable[] {
    return this.filterByType(isSkill, recommended);
  }

  getQuests(recommended = true): IQuest[] {
    return this.filterByType(isQuest, recommended);
  }

  getAchievements(recommended = true): IAchievement[] {
    return this.filterByType(isAchievement, recommended);
  }
}
