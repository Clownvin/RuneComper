import {loadWikiPage} from '../rswiki';
import {Requirement} from './requirement';
import {SKILL_SET, Skill} from '../model/runescape';

interface QuestRequirement extends Requirement {
  miniquest: boolean;
}

export async function getQuestsAndQuestNames() {
  const rawQuests = [...(await getQuests()), ...(await getMiniquests())];
  const questNames = new Set(rawQuests.map(q => q.name));
  return {
    questNames,
    quests: await getQuestsWithRequirements(rawQuests, questNames),
  };
}

const LIST_OF_QUESTS_PAGE = '/w/List_of_quests';

async function getQuests() {
  console.log('Scraping quest list...');
  const $ = await loadWikiPage(LIST_OF_QUESTS_PAGE);

  const questRows = $('html body div#bodyContent table tbody');
  const quests: {name: string; page: string; miniquest: false}[] = [];
  questRows.find('tr').each((_, e) => {
    const a = $(e).find('td a');
    const name = a.attr('title');
    const link = a.attr('href');
    if (!name || !link) {
      return;
    }
    quests.push({
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
  console.log('Scraping miniquest list...');
  const $ = await loadWikiPage(MINIQUESTS_PAGE);

  const quests: {name: string; page: string; miniquest: true}[] = [];

  const questRows = $('html body div#bodyContent table[width="100%"] tbody');
  questRows.find('tr').each((_, e) => {
    const a = $(e).find('td a');
    const name = a.attr('title');
    const link = a.attr('href');
    if (!name || !link) {
      return;
    }
    quests.push({
      name: name,
      page: link,
      miniquest: true,
    });
  });

  quests.sort((a, b) => a.name.localeCompare(b.name));

  return quests;
}

async function getQuestsWithRequirements(
  quests: {name: string; page: string; miniquest: boolean}[],
  questNames: Set<string>
) {
  const withRequirements: QuestRequirement[] = [];
  for (const quest of quests) {
    withRequirements.push(await getQuestWithRequirements(quest, questNames));
  }
  return withRequirements;
}

async function getQuestWithRequirements(
  quest: {name: string; page: string; miniquest: boolean},
  questNames: Set<string>
): Promise<QuestRequirement> {
  console.log(`Scraping ${quest.page}...`);
  const $ = await loadWikiPage(quest.page);

  const requirement: QuestRequirement = {
    ...quest,
    type: 'quest',
    quests: [],
    achievements: [],
    skills: [],
  };

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
        if (/^\d\d?\s+\w/.test(text) && !text.includes('quest point')) {
          const [level, skill] = text.split(/\s+\[?/);
          if (!skill || !SKILL_SET.has(skill as Skill)) {
            return;
          }
          requirement.skills.push({
            name: skill,
            level: parseInt(level) || 0,
            type: 'skill',
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
              requirement.quests.find(quest => quest.name === text)
            ) {
              return;
            }
            console.log('Adding quest requirement', text);
            requirement.quests.push({
              name: text,
              page,
              required,
              type: 'quest',
            });
          });
        }
      });
    });
  return requirement;
}