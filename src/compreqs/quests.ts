import {getSkillPage, loadWikiPage} from '../rswiki';
import {
  IQuest,
  IRequirements,
  Requirement,
  RequirementID,
  getRequirementID,
} from './requirement';
import {Skill, isSkill} from '../model/runescape';
import {AndOrMap} from '../util/andOrMap';

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

  const questRows = $('html body div#bodyContent table[width="100%"] tbody');
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
    .find('tr')
    .each((_, e) => {
      const row = $(e);
      const header = row.find('th.questdetails-header').text();
      if (header !== 'Requirements' && header !== 'Recommended') {
        return;
      }
      const required = header === 'Requirements';
      row.find('ul li').each((_, e) => {
        const ele = $(e);
        let text = ele.text();
        if (text === null) {
          return;
        }
        text = text.toLowerCase();
        if (/^\d+\s+\w/.test(text) && !text.includes('quest point')) {
          // if (quest.name === 'As a First Resort') {
          //   console.log(text);
          // }
          if (
            /\s((or)|(and))\s/g.test(text)
            // !/((\d+)|(one)|(two)) or \d+/g.test(text)
          ) {
            if (text.toLocaleLowerCase().includes("warriors' guild access")) {
              requirement.add({
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
              });
              return;
            }
            if (/\d+\s+\w+\s+((and)|(or))\s+\d+\s+\w+/.test(text)) {
              const [lvlA, skillA, diff, levelB, skillB] = text
                .trim()
                .replace(/\s+/g, ' ')
                .split(' ');
              console.log(lvlA, skillA, diff, levelB, skillB);
            }
            console.log(quest.page, 'HAS AND/OR');
            console.log(text);
            console.log();
          }
          const [level, skill] = text.split(/\s+\[?/);
          if (!isSkill(skill)) {
            return;
          }
          requirement.add({
            type: 'skill',
            name: skill,
            page: getSkillPage(skill),
            level: parseInt(level) || 0,
            boostable: text.includes('[b]'),
          });
        } else {
          ele.find('>a').each((_, a) => {
            const text = $(a).text();
            const page = $(a).attr('href');
            if (!page || !questNames.has(text)) {
              return;
            }
            if (
              text === quest.name ||
              requirement.find(quest => quest.name === text)
            ) {
              return;
            }
            // if () {}
            requirement.add({
              name: text,
              page,
              type: 'quest' as const,
              miniquest: false,
              required,
            });
          });
        }
      });
    });
  return requirement;
}
