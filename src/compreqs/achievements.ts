import {SKILL_SET, Skill} from '../model/runescape';
import {loadWikiPage} from '../rswiki';
import {Requirement} from './requirement';

const TRIMMED_PAGE = '/w/Trimmed_Completionist_Cape_(achievement)';

async function getCompletionistCapeAchievements() {
  const $ = await loadWikiPage(TRIMMED_PAGE);
  const achievementRows = $('html body div#bodyContent table.wikitable tbody');
  const achievements: {name: string; page: string}[] = [];
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
    });
  });
  achievements.sort((a, b) => a.name.localeCompare(b.name));

  achievements.push({
    name: 'Trimmed Completionist',
    page: '/w/Trimmed_Completionist_Cape_(achievement)',
  });
  return achievements;
}

export async function getCompletionistCapeAchievementsWithRequirements(
  // quests: {
  //   name: string;
  //   page: string;
  //   miniquest: boolean;
  // }[],
  questNames: Set<string>
) {
  let achievements = await getCompletionistCapeAchievements();
  //TODO: Add Task Master stuff back
  // achievements.push(...taskMasterAchievements);
  const achievementsWithRequirements = [] as Requirement[];
  const index = achievements.findIndex(
    achievement => achievement.name === 'Trimmed Completionist'
  );
  if (index === -1) {
    throw new Error('No completionist achievement');
  }
  const [completionist] = achievements.splice(index, 1);
  do {
    const newAchievements = [] as Requirement[];
    for (const achievement of achievements) {
      if (achievement.name === 'Trimmed Completionist') {
        continue;
      }
      newAchievements.push(
        await getAchievementWithRequirements(achievement, questNames)
      );
    }
    achievementsWithRequirements.push(...newAchievements);
    achievements = [];
    newAchievements.forEach(achievement => {
      if (!achievement.achievements) {
        return;
      }
      achievement.achievements.forEach(a => {
        if (
          achievementsWithRequirements.find(
            existing => existing.page === a.page
          ) ||
          achievements.find(existing => existing.page === a.page)
        ) {
          return;
        }
        if (a.page.endsWith('#Achievements')) {
          throw new Error(
            'Founds on ' + achievement.name + ' ' + achievement.page
          );
        }
        achievements.push(a);
      });
    });
  } while (achievements.length > 0);
  achievementsWithRequirements.push({
    ...completionist,
    achievements: achievementsWithRequirements
      .slice()
      .map(({name, page}) => ({name, page, type: 'achievement'})),
    skills: [],
    quests: [],
    type: 'achievement',
  });
  return achievementsWithRequirements;
}

async function getAchievementWithRequirements(
  achievement: {
    name: string;
    page: string;
  },
  questNames: Set<string>
): Promise<Requirement> {
  switch (achievement.name) {
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
      return getAchievementWithNormalRequirements(achievement, questNames);
  }
}

async function getAchievementWithNormalRequirements(
  achievement: {
    name: string;
    page: string;
  },
  questNames: Set<string>
): Promise<Requirement> {
  const $ = await loadWikiPage(achievement.page);
  const element = $('#infobox-achievement td.qc-active');
  const html = element.html();

  const requirement = {
    ...achievement,
    achievements: [],
    quests: [],
    skills: [],
    type: 'achievement',
  } as Requirement;

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
                requirement.quests.push({
                  name,
                  page,
                  type: 'quest',
                  required: true,
                });
              } else {
                requirement.achievements.push({
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
      if (!skill || !SKILL_SET.has(skill as Skill)) {
        return;
      }
      requirement.skills.push({
        name: skill,
        level: parseInt(level) || 1,
        type: 'skill',
      });
    } else {
      const title = ele.find('a').attr('title');
      const page = (ele.find('a').attr('href') || '').split('#')[0];
      if (!title) {
        return;
      }
      if (questNames.has(title)) {
        requirement.quests.push({
          name: title,
          page,
          required: true,
          type: 'quest',
        });
      } else if (requirement.achievements && !nonAchievs.has(title)) {
        requirement.achievements.push({
          name: title,
          page,
          type: 'achievement',
        });
      }
    }
  });
  return requirement;
}

const nonAchievs = new Set(['Lunar Spellbook']);
