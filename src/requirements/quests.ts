import {getSkillPage, loadWikiPage} from '../rswiki';
import {
  IQuest,
  IRequirements,
  ISKillBoostable,
  Requirement,
  RequirementID,
  getRequirementID,
} from './requirement';
import {Skill, isSkill} from '../model/runescape';
import {AndOrMap} from '../util/andOrMap';
import {CombatRequirement} from './combat';
import {isNonNullish} from '../util';

export class QuestRequirement extends Requirement<'quest'> implements IQuest {
  readonly miniquest: boolean;
  readonly id: RequirementID;

  constructor({
    miniquest,
    ...rest
  }: Omit<ConstructorParameters<typeof Requirement>[0], 'type'> & {
    miniquest: boolean;
  }) {
    super({...rest, type: 'quest'});
    this.miniquest = miniquest;
    this.id = getRequirementID(this);
  }
}

export async function getQuestsAndQuestNames() {
  const rawQuests = [...(await getQuests()), ...(await getMiniquests())];
  const questNames = new Set(rawQuests.map(q => q.name));
  const miniquestNames = new Set(
    rawQuests.filter(q => q.miniquest).map(q => q.name)
  );
  return {
    questNames,
    miniquestNames,
    quests: await getQuestsWithRequirements(rawQuests, questNames),
  };
}

const LIST_OF_QUESTS_PAGE = '/w/List_of_quests';

async function getQuests() {
  const $ = await loadWikiPage(LIST_OF_QUESTS_PAGE);

  const questRows = $('html body div#bodyContent table tbody');
  const quests: IQuest[] = [];
  questRows.find('tr').each((_, e) => {
    const a = $(e).find('td a');
    const name = a.attr('title');
    const link = a.attr('href');
    if (!name || !link) {
      return;
    }
    quests.push({
      type: 'quest',
      name: name,
      page: link,
      miniquest: false,
    });
  });
  quests.sort((a, b) => a.name.localeCompare(b.name));
  console.log('Found', quests.length, 'quests');
  return quests;
}

const MINIQUESTS_PAGE = '/w/Miniquests';

export async function getMiniquests() {
  //https://runescape.wiki/w/Miniquests
  const $ = await loadWikiPage(MINIQUESTS_PAGE);

  const quests: IQuest[] = [];

  const questRows = $('html body div#bodyContent table tbody');
  questRows.find('tr').each((_, e) => {
    const a = $(e).find('td a');
    const name = a.attr('title');
    const link = a.attr('href');
    if (!name || !link) {
      return;
    }
    quests.push({
      type: 'quest',
      name: name,
      page: link,
      miniquest: true,
    });
  });

  quests.sort((a, b) => a.name.localeCompare(b.name));

  return quests;
}

async function getQuestsWithRequirements(
  quests: IQuest[],
  questNames: Set<string>
) {
  const withRequirements: QuestRequirement[] = [];
  for (const quest of quests) {
    withRequirements.push(await getQuestWithRequirements(quest, questNames));
  }
  return withRequirements;
}

async function getQuestWithRequirements(
  quest: IQuest,
  questNames: Set<string>
): Promise<QuestRequirement> {
  const requirement = new QuestRequirement(quest);

  const $ = await loadWikiPage(quest.page);
  $('table.questdetails tbody')
    .children('tr')
    .each((_, e) => {
      const row = $(e);
      const header = row.children('th.questdetails-header');
      const headerText = header.text();

      if (
        headerText !== 'Requirements' &&
        headerText !== 'Recommended' &&
        headerText !== 'Follows events' &&
        headerText !== 'Full completion'
      ) {
        return;
      }

      // if (
      //   quest.name === 'The World Wakes' ||
      //   quest.name === 'Ritual of the Mahjarrat'
      // ) {
      //   console.log('Doing', quest.name);
      //   console.log(headerText);
      // }

      const required = headerText === 'Requirements';
      const rows = row
        .find('ul li')
        .toArray()
        .map(e => {
          const ele = $(e);
          const text = ele.text();
          if (text === null) {
            return text;
          }
          return [text.toLowerCase(), ele] as const;
        })
        .filter(isNonNullish);

      let or: {or: AndOrMap<IRequirements>} | undefined;
      rows.forEach(([text, ele]) => {
        const req = (() => {
          if (/^\d+\s+\w/.test(text) && !text.includes('quest point')) {
            if (
              /\d+\s+combat(\s+or\s+more)?(\s+is)?(\s+strongly)?(\s+recommended)?\.?$/.test(
                text
              )
            ) {
              const [combat] = text.split(/\s+/g);
              return new CombatRequirement(Number.parseFloat(combat));
            }
            // if (quest.name === 'As a First Resort') {
            //   console.log(text);
            // }
            if (
              /\s((or)|(and))\s/g.test(text)
              // !/((\d+)|(one)|(two)) or \d+/g.test(text)
            ) {
              if (text.includes("warriors' guild access")) {
                return {
                  or: new AndOrMap<IRequirements>(
                    {
                      name: Skill.ATTACK,
                      type: 'skill',
                      page: getSkillPage(Skill.ATTACK),
                      level: 99,
                      boostable: false,
                    },
                    {
                      name: Skill.STRENGTH,
                      type: 'skill',
                      page: getSkillPage(Skill.ATTACK),
                      level: 99,
                      boostable: false,
                    },
                    {
                      and: new AndOrMap<IRequirements>(
                        {
                          name: Skill.ATTACK,
                          type: 'skill',
                          page: getSkillPage(Skill.ATTACK),
                          level: 65,
                          boostable: false,
                        },
                        {
                          name: Skill.STRENGTH,
                          type: 'skill',
                          page: getSkillPage(Skill.STRENGTH),
                          level: 65,
                          boostable: false,
                        }
                      ),
                    }
                  ),
                };
              }
              if (/\d+\s+\w+\s+((and)|(or))\s+\d+\s+\w+/.test(text)) {
                const [lvlA, skillA, diff, lvlB, skillB] = text
                  .trim()
                  .replace(/\s+/g, ' ')
                  .split(' ');
                // console.log('FOUND SKILLS:', lvlA, skillA, diff, lvlB, skillB);
                if (
                  isSkill(skillA) &&
                  isSkill(skillB) &&
                  (diff === 'and' || diff === 'or')
                ) {
                  return {
                    [diff as 'and']: new AndOrMap<IRequirements>(
                      <ISKillBoostable>{
                        name: skillA,
                        type: 'skill',
                        page: getSkillPage(skillA),
                        level: Number.parseFloat(lvlA),
                        boostable: false,
                      },
                      <ISKillBoostable>{
                        name: skillB,
                        type: 'skill',
                        page: getSkillPage(skillB),
                        level: Number.parseFloat(lvlB),
                        boostable: false,
                      }
                    ),
                  };
                } else {
                  console.log('is', skillA, 'skill?', isSkill(skillA));
                  console.log('is', skillB, 'skill?', isSkill(skillB));
                  console.log('diff:', diff);
                }
              }
              if (/\d+\s+\w+\s+or\s+more/.test(text)) {
                console.log('Or more:', text);
              }
              console.log(quest.page, 'HAS AND/OR');
              console.log(text);
              console.log();
            }
            const [level, skill] = text.split(/\s+\[?/);
            if (!isSkill(skill)) {
              return undefined;
            }
            return {
              type: 'skill' as const,
              name: skill,
              page: getSkillPage(skill),
              level: parseInt(level) || 0,
              boostable: text.includes('[b]'),
            };
          } else {
            return ele
              .find('>a')
              .toArray()
              .map(a => {
                const text = $(a).text();
                const page = $(a).attr('href');
                // if (quest.name === 'Ritual of the Mahjarrat') {
                //   console.log(text);
                // }
                if (!page || !questNames.has(text)) {
                  // if (quest.name === 'Ritual of the Mahjarrat') {
                  //   console.log('Not including', text);
                  // }
                  return undefined;
                }
                if (
                  text === quest.name ||
                  requirement.find(quest => quest.name === text, true)
                ) {
                  return undefined;
                }
                // if () {}
                return {
                  name: text,
                  page,
                  type: 'quest' as const,
                  miniquest: false,
                  required,
                };
              })
              .filter(isNonNullish);
          }
        })();

        if (!req) {
          return undefined;
        }

        if (text.trim().endsWith('or')) {
          console.log('OR');
          if (!or) {
            or = {or: new AndOrMap()};
          }
          or.or.add(...(Array.isArray(req) ? req : [req]));
        } else if (or) {
          or.or.add(...(Array.isArray(req) ? req : [req]));
          console.log('Adding or', JSON.stringify(or, null, 2));
          requirement[required ? 'required' : 'recommended'].add(or);
          or = undefined;
        } else {
          requirement[required ? 'required' : 'recommended'].add(
            ...(Array.isArray(req) ? req : [req])
          );
        }

        return undefined;
      });
    });
  return requirement;
}
