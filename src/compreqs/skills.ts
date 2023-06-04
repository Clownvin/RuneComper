import {SKILLS} from '../model/runescape';
import {upperFirst} from '../util';
import {Requirement} from './requirement';

export interface SkillRequirement extends Requirement {
  level: number;
  maximumLevelRequirement: number;
}

const skill120s = new Set([
  'archaeology',
  'dungeoneering',
  'farming',
  'herblore',
  'invention',
  'slayer',
]);

export function getSkillRequirements(): SkillRequirement[] {
  const reqs = [] as SkillRequirement[];
  for (const skill of SKILLS) {
    const page = `/w/${upperFirst(skill)}` as const;
    const max = skill120s.has(skill) ? 120 : 99;
    for (let level = 2; level <= max; level++) {
      const req = {
        type: 'skill',
        name: skill,
        maximumLevelRequirement: level - 1,
        page,
        level,
        quests: [],
        achievements: [],
        skills: [
          {
            name: skill,
            level: level - 1,
            type: 'skill',
            page,
          },
        ],
      } as SkillRequirement;
      if (skill === 'invention' && req.maximumLevelRequirement < 80) {
        req.maximumLevelRequirement = 80;
      }
      reqs.push(req);
    }
  }
  return reqs;
}
