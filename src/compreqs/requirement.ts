import {Skill} from '../model/runescape';

export type Type = 'quest' | 'skill' | 'achievement';

export interface IRequirement {
  name: string;
  page: string;
  type: Type;
}

export interface IAchievement extends IRequirement {
  type: 'achievement';
}

export interface IQuest extends IRequirement {
  type: 'quest';
  required: boolean;
}

export interface ISkill extends IRequirement {
  type: 'skill';
  name: Skill;
  level: number;
}

export abstract class Requirement {
  readonly type: Type;
  readonly name: string;
  readonly page: string;
  #achievements: IAchievement[];
  #quests: IQuest[];
  #skills: ISkill[];

  constructor({
    type,
    name,
    page,
    achievements = [],
    quests = [],
    skills = [],
  }: {
    type: Type;
    name: string;
    page: string;
    achievements?: IAchievement[];
    quests?: IQuest[];
    skills?: ISkill[];
  }) {
    this.type = type;
    this.name = name;
    this.page = page;
    this.#achievements = achievements;
    this.#quests = quests;
    this.#skills = skills;
  }

  add(...reqs: (IAchievement | IQuest | ISkill)[]) {
    for (const req of reqs) {
      switch (req.type) {
        case 'achievement':
          this.#achievements.push(req);
          break;
        case 'quest':
          this.#quests.push(req);
          break;
        case 'skill':
          this.#skills.push(req);
          break;
      }
    }
  }

  get achievements() {
    return Object.freeze(this.#achievements.slice().map(a => Object.freeze(a)));
  }

  get quests() {
    return Object.freeze(this.#quests.slice().map(q => Object.freeze(q)));
  }

  get skills() {
    return Object.freeze(this.#skills.slice().map(s => Object.freeze(s)));
  }
}
