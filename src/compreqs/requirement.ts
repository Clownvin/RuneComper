import {Skill} from '../model/runescape';
import {AndOrElement, AndOrMap} from '../util/andOrMap';

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

export abstract class Requirement<T extends Type = Type>
  extends AndOrMap<IRequirements>
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
    requirements?: Readonly<AndOrElement<IRequirements>[]>;
  }) {
    super(...requirements);
    this.type = type;
    this.name = name;
    this.page = page;
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
