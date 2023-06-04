import {UpperFirst, upperFirst} from '../util';

export enum Skill {
  ATTACK = 'attack',
  DEFENCE = 'defence',
  STRENGTH = 'strength',
  CONSTITUTION = 'constitution',
  RANGED = 'ranged',
  PRAYER = 'prayer',
  MAGIC = 'magic',
  COOKING = 'cooking',
  WOODCUTTING = 'woodcutting',
  FLETCHING = 'fletching',
  FISHING = 'fishing',
  FIREMAKING = 'firemaking',
  CRAFTING = 'crafting',
  SMITHING = 'smithing',
  MINING = 'mining',
  HERBLORE = 'herblore',
  AGILITY = 'agility',
  THIEVING = 'thieving',
  SLAYER = 'slayer',
  FARMING = 'farming',
  RUNECRAFTING = 'runecrafting',
  HUNTER = 'hunter',
  CONSTRUCTION = 'construction',
  SUMMONING = 'summoning',
  DUNGEONEERING = 'dungeoneering',
  DIVINATION = 'divination',
  INVENTION = 'invention',
  ARCHAEOLOGY = 'archaeology',
}

//Ordered by RuneScape ID
export const SKILLS = Object.freeze([
  Skill.ATTACK,
  Skill.DEFENCE,
  Skill.STRENGTH,
  Skill.CONSTITUTION,
  Skill.RANGED,
  Skill.PRAYER,
  Skill.MAGIC,
  Skill.COOKING,
  Skill.WOODCUTTING,
  Skill.FLETCHING,
  Skill.FISHING,
  Skill.FIREMAKING,
  Skill.CRAFTING,
  Skill.SMITHING,
  Skill.MINING,
  Skill.HERBLORE,
  Skill.AGILITY,
  Skill.THIEVING,
  Skill.SLAYER,
  Skill.FARMING,
  Skill.RUNECRAFTING,
  Skill.HUNTER,
  Skill.CONSTRUCTION,
  Skill.SUMMONING,
  Skill.DUNGEONEERING,
  Skill.DIVINATION,
  Skill.INVENTION,
  Skill.ARCHAEOLOGY,
] as const);

export const SKILL_SET = Object.freeze(new Set(SKILLS));

export const SKILLS_BY_ID = (() => {
  const map = new Map<number, Skill>();
  SKILLS.forEach((name, id) => map.set(id, name));
  return Object.freeze(map);
})();

export function isSkill(text: string): text is Skill {
  return SKILL_SET.has(text as Skill);
}

export type SkillPage<S extends Skill = Skill> = `/w/${UpperFirst<S>}`;

export function getSkillPage<S extends Skill = Skill>(skill: S): SkillPage<S> {
  return `/w/${upperFirst(skill)}` as const;
}
