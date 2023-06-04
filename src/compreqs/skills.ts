import {SKILLS, Skill, SkillPage, getSkillPage} from '../model/runescape';
import {loadWikiPage} from '../rswiki';
import {Requirement} from './requirement';

const SKILL_REQS: Partial<Record<Skill, [number, Skill, ...Skill[]]>> = {
  [Skill.INVENTION]: [80, Skill.DIVINATION, Skill.CRAFTING, Skill.SMITHING],
};

export class SkillRequirement extends Requirement {
  readonly level: number;
  constructor({
    name,
    level,
    page = getSkillPage(name),
    skills = [
      {
        name,
        level: level - 1,
        type: 'skill',
        page,
      },
    ],
    ...rest
  }: Omit<ConstructorParameters<typeof Requirement>[0], 'type' | 'name'> & {
    name: Skill;
    level: number;
    page?: string;
  }) {
    super({...rest, type: 'skill', name, page, skills});
    this.level = level;
  }
}

export async function getSkillRequirements(): Promise<SkillRequirement[]> {
  const reqs = [] as SkillRequirement[];
  for (const skill of SKILLS) {
    const {page, maxLevel} = await getSkillInfo(skill);
    for (let level = 2; level <= maxLevel; level++) {
      const req = new SkillRequirement({name: skill, level, page});

      if (level === 2 && SKILL_REQS[skill]) {
        const [level, ...skills] = SKILL_REQS[skill]!;

        const reqs: SkillRequirement['skills'] = skills.map(name => ({
          name,
          level,
          type: 'skill',
          page: getSkillPage(name),
        }));

        req.add(...reqs);
      }

      reqs.push(req);
    }
  }
  return reqs;
}

async function getSkillInfo(skill: Skill) {
  const page = getSkillPage(skill);
  const maxLevel = await getMaxLevel(page);

  return {
    page,
    maxLevel,
  };
}

async function getMaxLevel(page: SkillPage) {
  const $ = await loadWikiPage(`${page}/Level_up_table`);
  const levelupRows = $('html body div#bodyContent table.level-up-table tr th')
    .toArray()
    .map(e => $(e).text());

  const MIN_ROWS_120 = 124; // Extra 4 due to table headers

  return levelupRows.length >= MIN_ROWS_120 ? 120 : 99;
}
