import {isSkill} from '../model/runescape';
import {getSkillPage, loadWikiPage} from '../rswiki';
import {
  IAchievement,
  IRequirement,
  Requirement,
  getRequirementID,
} from './requirement';

export class AchievementRequirement
  extends Requirement<'achievement'>
  implements IAchievement
{
  readonly id = getRequirementID(this);

  constructor(
    params: Omit<ConstructorParameters<typeof Requirement>[0], 'type'>
  ) {
    super({...params, type: 'achievement'});
  }
}

export async function getCompletionistCapeAchievementsWithRequirements(
  questNames: Set<string>,
  miniquestNames: Set<string>
) {
  const {trimmed, achievements} = await getCompletionistCapeAchievements();
  //TODO: Add Task Master stuff back
  // achievements.push(...taskMasterAchievements);

  const reqsWithReqs = [] as AchievementRequirement[];
  let reqsWithoutReqs = achievements;
  do {
    const requirements = [] as AchievementRequirement[];
    for (const achievement of reqsWithoutReqs) {
      if (achievement.name === 'Trimmed Completionist') {
        throw new Error('Unexpected?');
        // continue;
      }
      requirements.push(
        await getAchievementWithRequirements(
          achievement,
          questNames,
          miniquestNames
        )
      );
    }
    reqsWithReqs.push(...requirements);
    reqsWithoutReqs = [];
    requirements.forEach(requirement => {
      requirement.forEach(requirement => {
        if (
          reqsWithReqs.find(existing => existing.page === requirement.page) ||
          reqsWithoutReqs.find(
            existing => existing.page === requirement.page
          ) ||
          questNames.has(requirement.name)
        ) {
          return;
        }
        reqsWithoutReqs.push(requirement);
      }, true);
    });
  } while (reqsWithoutReqs.length > 0);

  const required = new Set(achievements.map(a => a.name));

  return {
    trimmed: new AchievementRequirement({
      name: trimmed.name,
      page: trimmed.page,
      icon: '',
      required: reqsWithReqs
        .filter(r => required.has(r.name))
        .map(({name, page}) => ({
          name,
          page,
          type: 'achievement',
        })),
    }),
    achievements: reqsWithReqs,
  };
}

const TRIMMED_PAGE = '/w/Trimmed_Completionist_Cape_(achievement)';

async function getCompletionistCapeAchievements() {
  const $ = await loadWikiPage(TRIMMED_PAGE);

  const achievements: IRequirement[] = [];

  const achievementRows = $('html body div#bodyContent table.wikitable tbody');
  achievementRows.find('tr').each((_, e) => {
    const a = $(e).find('td a');
    const name = a.attr('title');
    const link = a.attr('href');

    if (!name || !link) {
      return;
    }

    achievements.push({
      name: name,
      page: link,
      type: 'achievement',
    });
  });

  achievements.sort((a, b) => a.name.localeCompare(b.name));

  return {
    trimmed: {
      name: 'Trimmed Completionist',
      page: '/w/Trimmed_Completionist_Cape_(achievement)',
    },
    achievements,
  };
}

async function getAchievementWithRequirements(
  requirement: IRequirement,
  questNames: Set<string>,
  miniquestNames: Set<string>
): Promise<AchievementRequirement> {
  switch (requirement.name) {
    //Achievements marked as no requirements
    // case 'Big Chinchompa':
    // case 'Stay Safe':
    // case 'Stay Secure':
    // case 'Father and Son (achievement)':
    // case 'Da Vinci who?':
    // case 'Bag of Herbs':
    // case 'Music Maestro':
    // case 'Top Town Hall':
    // case 'Kudos to You':
    // case 'Big Chinchompa (achievement)':
    //   return {
    //     ...achievement,
    //     achievements: [],
    //     skills: [],
    //     quests: [],
    //     type: 'achievement',
    //   };
    default:
      return getAchievementWithNormalRequirements(
        requirement,
        questNames,
        miniquestNames
      );
  }
}

const nonAchievs = new Set(['Lunar Spellbook']);

async function getAchievementWithNormalRequirements(
  {
    name,
    page,
  }: {
    name: string;
    page: string;
  },
  questNames: Set<string>,
  miniquestNames: Set<string>
): Promise<AchievementRequirement> {
  const $ = await loadWikiPage(page);
  const element = $('#infobox-achievement td.qc-active');
  const html = element.html();

  const requirement = new AchievementRequirement({name, page, icon: ''});

  if (html === null) {
    return requirement;
  }

  const seeAchievements =
    /See\s(<.*>)?\s?((achievements)|(article)|(requirements))/;
  if (seeAchievements.test(html) || html.includes('See article')) {
    const achievementRows = $(
      'html body div#bodyContent table.wikitable tbody'
    );
    achievementRows.find('tr').each((_, e) => {
      $(e)
        .find('td')
        .each((i, e) => {
          //If task master, only do last column
          if (requirement.name === 'Task Master') {
            if (i !== 2) {
              return;
            }
          }
          //If set tasks only do second column
          else if (requirement.name.includes('Set Tasks - ')) {
            if (i !== 1) {
              return;
            }
          } else if (i > 0) {
            return;
          }
          $(e)
            .find('a')
            .each((_, e) => {
              const a = $(e);
              const name = a.attr('title') as string;
              const page = (a.attr('href') || '').split('#')[0];

              if (questNames.has(name as string)) {
                requirement.addRequired({
                  name,
                  page,
                  type: 'quest',
                  miniquest: miniquestNames.has(name),
                });
              } else {
                requirement.addRequired({
                  name,
                  page,
                  type: 'achievement',
                });
              }
            });
        });
    });
  } else if (/See\s(<.*>)?\s?\w+/.test(html)) {
    console.log('HTML includes a "See":', html);
  }
  element.find('li').each((_, e) => {
    const ele = $(e);
    const html = ele.text() || '';
    if (/^\d+\s+\w+/.test(html)) {
      const [level, skill] = html.toLowerCase().split(/\s+\[?/);
      if (!isSkill(skill)) {
        return;
      }
      requirement.addRequired({
        name: skill,
        level: parseInt(level) || 1,
        type: 'skill',
        page: getSkillPage(skill),
        boostable: html.includes('[b]'),
      });
    } else {
      const name = ele.find('a').attr('title');
      const page = (ele.find('a').attr('href') || '').split('#')[0];
      if (!name) {
        return;
      }
      if (questNames.has(name)) {
        requirement.addRequired({
          name,
          page,
          type: 'quest',
          miniquest: miniquestNames.has(name),
        });
      } else if (!nonAchievs.has(name)) {
        if (name.includes('Peril')) {
          console.log('Achieve name?', name);
        }
        requirement.addRequired({
          name,
          page,
          type: 'achievement',
        });
      }
    }
  });
  return requirement;
}
