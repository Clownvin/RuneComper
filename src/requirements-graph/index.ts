import axios from 'axios';
import * as cheerio from 'cheerio';
import {URLBuilder} from '../util/url';
import api, {skillNames, Skills} from '../runescape-api';

const rsWikiUrl = new URLBuilder('https://runescape.wiki');

const skill120s = new Set([
  'archaeology',
  'dungeoneering',
  'farming',
  'herblore',
  'invention',
  'slayer',
]);

const taskMasterAchievements = [
  {name: 'Ardougne Set Tasks - Easy', page: '/w/Ardougne_Set_Tasks_-_Easy'},
  {name: 'Ardougne Set Tasks - Medium', page: '/w/Ardougne_Set_Tasks_-_Medium'},
  {name: 'Ardougne Set Tasks - Hard', page: '/w/Ardougne_Set_Tasks_-_Hard'},
  {name: 'Ardougne Set Tasks - Elite', page: '/w/Ardougne_Set_Tasks_-_Elite'},
  {name: 'Desert Set Tasks - Easy', page: '/w/Desert_Set_Tasks_-_Easy'},
  {name: 'Desert Set Tasks - Medium', page: '/w/Desert_Set_Tasks_-_Medium'},
  {name: 'Desert Set Tasks - Hard', page: '/w/Desert_Set_Tasks_-_Hard'},
  {name: 'Desert Set Tasks - Elite', page: '/w/Desert_Set_Tasks_-_Elite'},
  {name: 'Daemonheim Set Tasks - Easy', page: '/w/Daemonheim_Set_Tasks_-_Easy'},
  {
    name: 'Daemonheim Set Tasks - Medium',
    page: '/w/Daemonheim_Set_Tasks_-_Medium',
  },
  {name: 'Daemonheim Set Tasks - Hard', page: '/w/Daemonheim_Set_Tasks_-_Hard'},
  {
    name: 'Daemonheim Set Tasks - Elite',
    page: '/w/Daemonheim_Set_Tasks_-_Elite',
  },
  {name: 'Falador Set Tasks - Easy', page: '/w/Falador_Set_Tasks_-_Easy'},
  {name: 'Falador Set Tasks - Medium', page: '/w/Falador_Set_Tasks_-_Medium'},
  {name: 'Falador Set Tasks - Hard', page: '/w/Falador_Set_Tasks_-_Hard'},
  {name: 'Falador Set Tasks - Elite', page: '/w/Falador_Set_Tasks_-_Elite'},
  {name: 'Fremennik Set Tasks - Easy', page: '/w/Fremennik_Set_Tasks_-_Easy'},
  {
    name: 'Fremennik Set Tasks - Medium',
    page: '/w/Fremennik_Set_Tasks_-_Medium',
  },
  {name: 'Fremennik Set Tasks - Hard', page: '/w/Fremennik_Set_Tasks_-_Hard'},
  {name: 'Fremennik Set Tasks - Elite', page: '/w/Fremennik_Set_Tasks_-_Elite'},
  {name: 'Karamja Set Tasks - Easy', page: '/w/Karamja_Set_Tasks_-_Easy'},
  {name: 'Karamja Set Tasks - Medium', page: '/w/Karamja_Set_Tasks_-_Medium'},
  {name: 'Karamja Set Tasks - Hard', page: '/w/Karamja_Set_Tasks_-_Hard'},
  {name: 'Karamja Set Tasks - Elite', page: '/w/Karamja_Set_Tasks_-_Elite'},
  {
    name: 'Lumbridge Set Tasks - Beginner',
    page: '/w/Lumbridge_Set_Tasks_-_Beginner',
  },
  {
    name: 'Lumbridge Set Tasks - Medium',
    page: '/w/Lumbridge_Set_Tasks_-_Medium',
  },
  {name: 'Lumbridge Set Tasks - Hard', page: '/w/Lumbridge_Set_Tasks_-_Hard'},
  {name: 'Lumbridge Set Tasks - Easy', page: '/w/Lumbridge_Set_Tasks_-_Easy'},
  {name: 'Menaphos Pyramid Scheme', page: '/w/Menaphos_Pyramid_Scheme'},
  {name: 'Morytania Set Tasks - Easy', page: '/w/Morytania_Set_Tasks_-_Easy'},
  {
    name: 'Morytania Set Tasks - Medium',
    page: '/w/Morytania_Set_Tasks_-_Medium',
  },
  {name: 'Morytania Set Tasks - Hard', page: '/w/Morytania_Set_Tasks_-_Hard'},
  {name: 'Morytania Set Tasks - Elite', page: '/w/Morytania_Set_Tasks_-_Elite'},
  {
    name: "Seers' Village Set Tasks - Easy",
    page: "/w/Seers'_Village_Set_Tasks_-_Easy",
  },
  {
    name: "Seers' Village Set Tasks - Medium",
    page: "/w/Seers'_Village_Set_Tasks_-_Medium",
  },
  {
    name: "Seers' Village Set Tasks - Hard",
    page: "/w/Seers'_Village_Set_Tasks_-_Hard",
  },
  {
    name: "Seers' Village Set Tasks - Elite",
    page: "/w/Seers'_Village_Set_Tasks_-_Elite",
  },
  {name: 'Tirannwn Set Tasks - Easy', page: '/w/Tirannwn_Set_Tasks_-_Easy'},
  {name: 'Tirannwn Set Tasks - Medium', page: '/w/Tirannwn_Set_Tasks_-_Medium'},
  {name: 'Tirannwn Set Tasks - Hard', page: '/w/Tirannwn_Set_Tasks_-_Hard'},
  {name: 'Tirannwn Set Tasks - Elite', page: '/w/Tirannwn_Set_Tasks_-_Elite'},
  {
    name: 'Varrock Set Tasks - Elite',
    page: '/w/Varrock_Set_Tasks_-_Elite',
  },
  {name: 'Varrock Set Tasks - Medium', page: '/w/Varrock_Set_Tasks_-_Medium'},
  {name: 'Varrock Set Tasks - Hard', page: '/w/Varrock_Set_Tasks_-_Hard'},
  {name: 'Varrock Set Tasks - Easy', page: '/w/Varrock_Set_Tasks_-_Easy'},
  {name: 'Wilderness Set Tasks - Easy', page: '/w/Wilderness_Set_Tasks_-_Easy'},
  {
    name: 'Wilderness Set Tasks - Medium',
    page: '/w/Wilderness_Set_Tasks_-_Medium',
  },
  {name: 'Wilderness Set Tasks - Hard', page: '/w/Wilderness_Set_Tasks_-_Hard'},
  {
    name: 'Wilderness Set Tasks - Elite',
    page: '/w/Wilderness_Set_Tasks_-_Elite',
  },
];

interface Requirement {
  maxLevel?: number;
  name: string;
  level?: number;
  page?: string;
  achievements?: {name: string; page: string}[];
  quests: {name: string; page: string}[];
  skills: {name: string; page: string; level: number}[];
}

let steps: Requirement[];
let calculating = false;

export async function getCompletionistCapeSteps(user: string) {
  await createCompletionistCapeStepsIfNeeded();
  const profile = await api.getProfileWithQuests(user);
  return steps
    .filter(step => {
      if (
        step.level &&
        profile.skills[step.name as Skills].level >= step.level
      ) {
        return false;
      }
      if (profile.quests[step.name] && profile.quests[step.name].completed) {
        return false;
      }
      return true;
    })
    .map(({name, page}) => ({name, page: page && rsWikiUrl.build(page)}));
}

async function createCompletionistCapeStepsIfNeeded() {
  if (!steps) {
    if (calculating) {
      do {
        await new Promise(r => setTimeout(r, 5000));
      } while (!steps);
    } else {
      calculating = true;
      console.log('Calculating steps...');
      steps = await createCompletionistCapeSteps();
      console.log('Finished');
      calculating = false;
    }
  }
}

async function createCompletionistCapeSteps(): Promise<Requirement[]> {
  const rawQuests = await getQuests();
  const questNames = new Set(rawQuests.map(q => q.name));

  const quests = await getQuestsWithRequirements(rawQuests, questNames);
  const achievements = await getCompletionistCapeAchievementsWithRequirements(
    rawQuests,
    questNames
  );

  const requirements = [...quests, ...achievements];

  const requirementMap = requirements.reduce((map, requirement) => {
    map.set(requirement.name, requirement);
    return map;
  }, new Map<string, Requirement>());

  requirements.sort(
    (a, b) =>
      a.maxLevel ||
      (a.maxLevel = getMaxLevel(a, requirementMap)) -
        (b.maxLevel || (b.maxLevel = getMaxLevel(b, requirementMap)))
  );

  const skills = skillNames.reduce((skills, name) => {
    skills[name] = 1;
    return skills;
  }, {} as {[x in Skills]: number});

  const requirementMetSet = new Set<string>();

  const steps = [] as Requirement[];

  for (let level = 2; level <= 120; level++) {
    for (const skill of skillNames) {
      if (level > 99 && !skill120s.has(skill)) {
        continue;
      }
      skills[skill] = level;
      const page = `/w/${skill[0].toUpperCase()}${skill.substring(1)}`;
      steps.push({
        name: `${skill}`,
        level: level,
        page: page,
        quests: [],
        achievements: [],
        skills: [{name: skill, page: page, level: level - 1}],
      });
      let index: number;
      while (
        (index = requirements.findIndex(req => {
          for (const skill of req.skills) {
            if (skills[skill.name as Skills] >= skill.level) {
              continue;
            }
            return false;
          }
          for (const quest of req.quests) {
            if (requirementMetSet.has(quest.name)) {
              continue;
            }
            return false;
          }
          for (const achievement of req.achievements || []) {
            if (requirementMetSet.has(achievement.name)) {
              continue;
            }
            return false;
          }
          return true;
        })) !== -1
      ) {
        const [req] = requirements.splice(index, 1);
        steps.push(req);
        requirementMetSet.add(req.name);
      }
    }
  }

  return steps;
}

function getMaxLevel(
  req: Requirement,
  achievements: Map<string, Requirement>
): number {
  const skillsMax = req.skills.reduce(
    (max, skill) => Math.max(max, skill.level),
    0
  );
  const questMax = req.quests.reduce((max, {name}) => {
    const req = achievements.get(name);
    if (!req) {
      return max;
    }
    return Math.max(max, getMaxLevel(req, achievements));
  }, 0);
  const achievMax = (req.achievements || []).reduce((max, {name}) => {
    const req = achievements.get(name);
    if (!req) {
      return max;
    }
    return Math.max(max, getMaxLevel(req, achievements));
  }, 0);
  return Math.max(skillsMax, Math.max(questMax, achievMax));
}

async function getQuests() {
  const url = rsWikiUrl.build('/w/List_of_quests');
  const result = await axios.get(url);
  const $ = cheerio.load(result.data);
  const questRows = $(
    'html body div#bodyContent.mw-body-content table[width="100%"] tbody'
  );
  const quests: {name: string; page: string}[] = [];
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
    });
  });
  quests.sort((a, b) => a.name.localeCompare(b.name));
  return quests;
}

async function getQuestsWithRequirements(
  quests: {name: string; page: string}[],
  questNames: Set<string>
) {
  const questsWithReqs: Requirement[] = [];
  for (const quest of quests) {
    const url = rsWikiUrl.build(quest.page);
    const response = await axios.get(url).catch(() => {
      console.error('FAILED TO LOAD QUEST', quest.name, quest.page);
    });
    if (!response) {
      return questsWithReqs;
    }
    const $ = cheerio.load(response.data);
    const requirements = {
      ...quest,
      quests: [] as Requirement[],
      achievements: [] as Requirement[],
      skills: [] as Requirement[],
    } as Requirement;
    $('table.questdetails tbody')
      .find('tr')
      .each((_, e) => {
        const row = $(e);
        if (row.find('th.questdetails-header').text() !== 'Requirements') {
          return;
        }
        row.find('ul li').each((_, e) => {
          const ele = $(e);
          let text = ele.text();
          if (text === null) {
            return;
          }
          text = text.toLowerCase();
          if (/^\d\d?\s+\w/.test(text) && !text.includes('quest point')) {
            const [level, skill] = text.split(/\s+\[?/);
            if (!skill || skill.includes(']')) {
              return;
            }
            const page = ele.find('a').attr('href');
            if (!page) {
              console.error('Page is null:' + text);
              return;
            }
            requirements.skills.push({
              name: skill,
              page,
              level: parseInt(level) || 0,
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
                requirements.quests.find(quest => quest.name === text)
              ) {
                return;
              }
              requirements.quests.push({
                name: text,
                page,
              });
            });
          }
        });
      });
    questsWithReqs.push(requirements);
  }
  return questsWithReqs;
}

async function getCompletionistCapeAchievementsWithRequirements(
  quests: {
    name: string;
    page: string;
  }[],
  questNames: Set<string>
) {
  let achievements = await getCompletionistCapeAchievements();
  achievements.push(...taskMasterAchievements);
  const achievementsWithRequirements = [] as Requirement[];
  const [completionist] = achievements.splice(
    achievements.findIndex(achievement => achievement.name === 'Completionist'),
    1
  );
  if (!completionist) {
    throw new Error('No completionist achievement');
  }
  achievementsWithRequirements.push({
    ...completionist,
    achievements: achievements,
    skills: [],
    quests: [],
  });
  do {
    const newAchievements = [] as Requirement[];
    for (const achievement of achievements) {
      if (achievement.name === 'Completionist') {
        continue;
      }
      newAchievements.push(
        await getAchievementWithRequirements(achievement, quests, questNames)
      );
    }
    achievementsWithRequirements.push(...newAchievements);
    achievements = [];
    newAchievements.forEach(achievement => {
      if (!achievement.achievements) {
        return;
      }
      achievement.achievements.forEach(achievement => {
        if (
          achievementsWithRequirements.find(
            existing => existing.page === achievement.page
          ) ||
          achievements.find(existing => existing.page === achievement.page)
        ) {
          return;
        }
        achievements.push(achievement);
      });
    });
  } while (achievements.length > 0);
  return achievementsWithRequirements;
}

async function getCompletionistCapeAchievements() {
  const url = rsWikiUrl.build('/w/Completionist_cape');
  const result = await axios.get(url);
  const $ = cheerio.load(result.data);
  const achievementRows = $(
    'html body div#bodyContent.mw-body-content table[width="100%"] tbody'
  );
  let achievements: {name: string; page: string}[] = [];
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
  //Filter out Master Quester, since we're requiring all quests anyway
  //Stacks on stacks because it's kinda an odd ball
  achievements = achievements.filter(a => a.name !== 'Stacks on Stacks');
  achievements.push({
    name: 'Completionist',
    page: '/w/Completionist_cape',
  });
  return achievements;
}

async function getAchievementWithRequirements(
  achievement: {
    name: string;
    page: string;
  },
  quests: {
    name: string;
    page: string;
  }[],
  questNames: Set<string>
): Promise<Requirement> {
  switch (achievement.name) {
    //Ignored because we added its composite achievements
    case 'Task Master':
      return {
        ...achievement,
        achievements: taskMasterAchievements,
        skills: [],
        quests: [],
      };
    case 'Master Quester':
      return {
        ...achievement,
        achievements: [],
        skills: [],
        quests: quests,
      };
    //Achievements marked as no requirements
    case 'Big Chinchompa':
    case 'Stay Safe':
    case 'Stay Secure':
    case 'Father and Son (achievement)':
    case 'Da Vinci who?':
    case 'Bag of Herbs':
    case 'Music Maestro':
    case 'Top Town Hall':
    case 'Kudos to You':
    case 'Big Chinchompa (achievement)':
      return {
        ...achievement,
        achievements: [],
        skills: [],
        quests: [],
      };
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
  const url = rsWikiUrl.build(achievement.page);
  const result = (await axios.get(url).catch(console.error)) || {data: ''};
  const $ = cheerio.load(result.data);
  const element = $('#infobox-achievement td.qc-active');
  const html = element.html();
  if (html === null) {
    return {
      ...achievement,
      achievements: [],
      skills: [],
      quests: [],
    };
  }
  if (html.includes('See article')) {
    console.log(
      'Achievement has additional info',
      achievement.name,
      achievement.page
    );
    return {
      ...achievement,
      achievements: [],
      skills: [],
      quests: [],
    };
  }
  const requirements = {
    ...achievement,
    achievements: [],
    quests: [],
    skills: [],
  } as Requirement;
  element.find('li').each((_, e) => {
    const ele = $(e);
    const html = ele.text() || '';
    if (/^\d+\s+\w+/.test(html)) {
      const [level, skill] = html.toLowerCase().split(/\s+\[?/);
      if (!skill || skill.includes(']')) {
        return;
      }
      const page = ele.find('a').attr('href');
      if (!page) {
        return;
      }
      requirements.skills.push({
        name: skill,
        page,
        level: parseInt(level) || 1,
      });
    } else {
      const title = ele.find('a').attr('title');
      const page = ele.find('a').attr('href') || '';
      if (!title) {
        return;
      }
      if (questNames.has(title)) {
        requirements.quests.push({name: title, page});
      } else if (requirements.achievements && !nonAchievs.has(title)) {
        requirements.achievements.push({name: title, page});
      }
    }
  });
  return requirements;
}

const nonAchievs = new Set(['Lunar Spellbook']);
