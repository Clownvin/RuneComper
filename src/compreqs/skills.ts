import {SKILLS, Skill} from '../model/runescape';
import {loadWikiPage} from '../rswiki';
import {upperFirst} from '../util';
import {Requirement} from './requirement';

export interface SkillRequirement extends Requirement {
  level: number;
  maximumLevelRequirement: number;
}

export async function getSkillInfo(skill: Skill) {
  const $ = await loadWikiPage(`/w/${upperFirst(skill)}/Level_up_table`);
  const levels = $('html body div#bodyContent table.level-up-table tr th')
    .toArray()
    .map(e => $(e).text());
  // console.log(levels);
  const MIN_ROWS_120 = 124; // Extra 4 due to table headers
  const is120 = levels.length >= MIN_ROWS_120;

  return {
    is120,
  };
}

export async function getSkillRequirements(): Promise<SkillRequirement[]> {
  const reqs = [] as SkillRequirement[];
  for (const skill of SKILLS) {
    const page = `/w/${upperFirst(skill)}` as const;
    const {is120} = await getSkillInfo(skill);
    const max = is120 ? 120 : 99;
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
