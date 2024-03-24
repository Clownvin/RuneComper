import moment from 'moment';
import {SKILLS, Skill} from '../model/runescape';
import {SkillPage, getSkillPage, loadWikiPage} from '../rswiki';
import {getImageFromPage} from '../rswiki/util';
import {
  ISkill,
  Requirement,
  RequirementID,
  getRequirementID,
} from './requirement';

const SKILL_REQS: Partial<Record<Skill, [number, Skill, ...Skill[]]>> = {
  [Skill.INVENTION]: [80, Skill.DIVINATION, Skill.CRAFTING, Skill.SMITHING],
};

export class SkillRequirement extends Requirement<'skill'> implements ISkill {
  readonly level: number;
  readonly name: Skill;
  readonly id: RequirementID;

  constructor({
    name,
    level,
    page = getSkillPage(name),
    required = [
      {
        name,
        level: level - 1,
        type: 'skill',
        page,
        boostable: false,
      },
    ],
    ...rest
  }: Omit<ConstructorParameters<typeof Requirement>[0], 'type' | 'name'> & {
    name: Skill;
    level: number;
    page?: string;
  }) {
    super({...rest, type: 'skill', name, page, required});
    this.name = name;
    this.level = level;
    this.id = getRequirementID(this);
  }
}

export async function getSkillRequirements(): Promise<SkillRequirement[]> {
  const reqs = [] as SkillRequirement[];
  for (const skill of SKILLS) {
    const {page, image, maxLevel} = await getSkillInfo(skill);
    reqs.push(
      new SkillRequirement({
        name: skill,
        level: 1,
        page,
        icon: image,
        required: [],
        released: moment(),
      })
    );
    for (let level = 2; level <= maxLevel; level++) {
      const req = new SkillRequirement({
        name: skill,
        level,
        page,
        icon: image,
        released: moment(),
      });

      if (level === 2 && SKILL_REQS[skill]) {
        const [level, ...skills] = SKILL_REQS[skill]!;
        req.required.add(
          ...skills.map(name => ({
            name,
            level,
            type: 'skill' as const,
            page: getSkillPage(name),
            boostable: false,
          }))
        );
      }

      reqs.push(req);
    }
  }
  return reqs;
}

async function getSkillInfo(skill: Skill) {
  const page = getSkillPage(skill);
  const [maxLevel, image] = await Promise.all([
    getMaxLevel(page),
    getImageFromPage(page),
  ]);

  return {
    page,
    image,
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
