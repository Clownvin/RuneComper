import axios from 'axios';
import * as cheerio from 'cheerio';
import {URLBuilder} from '../util/url';
import api, {skillNames, ProfileWithQuests, Skills} from '../runescape-api';

const rsWikiUrl = new URLBuilder('https://runescape.wiki');

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

export async function getCompletionistCapeRequirements() {
  const quests = await getQuests();
  const questNames = new Set(quests.map(q => q.name));
  const achievementsWithReqs = await getCompletionistCapeAchievementsWithRequirements(
    quests,
    questNames
  );
  const questsWithReqs = await getQuestsWithReqs(quests, questNames);
  console.log('DONE');
  return {
    achievements: achievementsWithReqs,
    quests: questsWithReqs,
    skills: getSkillingRequirements(),
  };
}

export async function createRequirementGraph() {
  const requirements = await getCompletionistCapeRequirements();
  const graph = new Map<string, Requirement>();
  for (const achievement of requirements.achievements) {
    if (graph.has(achievement.name)) {
      throw new Error('Graph already has achievement: ' + achievement.name);
    }
    graph.set(achievement.name, achievement);
  }
  for (const quest of requirements.quests) {
    if (graph.has(quest.name)) {
      throw new Error('Graph already has achievement: ' + quest.name);
    }
    graph.set(quest.name, quest);
  }
  for (const skill of requirements.skills) {
    if (graph.has(skill.name)) {
      throw new Error('Graph already has skill: ' + skill.name);
    }
    graph.set(skill.name, skill);
  }
  console.log('Finished creating graph');
  return graph;
}

let graph: Map<string, Requirement>;

export async function getRequirementPath(user: string) {
  if (!graph) {
    graph = await createRequirementGraph();
  }
  const profile = await api.getProfileWithQuests(user);
  const start = graph.get('Completionist');
  if (!start) {
    console.error('No completionist achievement');
    return [];
  }
  const [depths] = await getRequirementLayers(start, graph, profile);
  const requirements = [] as Requirement[];
  for (const depth of depths) {
    requirements.push(...depth);
  }
  return requirements;
}

interface Requirement {
  name: string;
  page?: string;
  achievements?: {name: string; page: string}[];
  quests: {name: string; page: string}[];
  skills: string[];
}

async function getRequirementLayers(
  node: Requirement,
  graph: Map<string, Requirement>,
  profile: ProfileWithQuests,
  depths = [] as Requirement[][],
  depth = 0,
  seen = new Set<string>()
): Promise<[Requirement[][], number]> {
  let maxDepth = depth;
  for (const quest of node.quests) {
    const {name} = quest;
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    if (profile.quests[name].completed) {
      console.log('Player has already completed quest:', name);
      continue;
    }
    const req = graph.get(name);
    if (!req) {
      console.error('No requirement for quest:', name);
      continue;
    }
    const [, newDepth] = await getRequirementLayers(
      req,
      graph,
      profile,
      depths,
      depth,
      seen
    );
    if (newDepth > maxDepth) {
      maxDepth = newDepth;
    }
  }
  for (const achievement of node.achievements || []) {
    const {name} = achievement;
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    //TODO implement
    // if (profile.achievements[name].completed) {
    //   console.log('Player has already completed achievement:', name)
    //   continue;
    // }
    const req = graph.get(name);
    if (!req) {
      console.error('No requirement for achievement:', name);
      continue;
    }
    const [, newDepth] = await getRequirementLayers(
      req,
      graph,
      profile,
      depths,
      depth,
      seen
    );
    if (newDepth > maxDepth) {
      maxDepth = newDepth;
    }
  }
  for (const skill of node.skills) {
    if (seen.has(skill)) {
      continue;
    }
    seen.add(skill);
    const [name] = skill.split(' ') as [Skills];
    if (!profile.skills[name]) {
      console.error('Not a skill:', name);
      continue;
    }
    if (
      formatSkill(name, profile.skills[name].level).localeCompare(skill) >= 0
    ) {
      console.log('Player already has', skill);
      continue;
    }
    const req = graph.get(skill);
    if (!req) {
      console.error('No requirement for', skill);
      continue;
    }
    const [, newDepth] = await getRequirementLayers(
      req,
      graph,
      profile,
      depths,
      depth,
      seen
    );
    if (newDepth > maxDepth) {
      maxDepth = newDepth;
    }
  }
  if (!depths[maxDepth]) {
    depths[maxDepth] = [];
  }
  depths[maxDepth].push(node);
  return [depths, maxDepth + 1];
}

function formatSkill(name: string, level: string | number) {
  level = '' + level;
  while (level.length < 3) {
    level = '0' + level;
  }
  return `${name} level ${level}`;
}

const skill120s = new Set([
  'archaeology',
  'dungeoneering',
  'farming',
  'herblore',
  'invention',
  'slayer',
]);

function getSkillingRequirements() {
  const requirements = [] as Requirement[];
  for (const skill of skillNames) {
    let level = skill === 'constitution' ? 11 : 2;
    const maxLevel = skill === 'combat' ? 138 : skill120s.has(skill) ? 120 : 99;
    for (; level <= maxLevel; level++) {
      requirements.push({
        name: formatSkill(skill, level),
        skills: [formatSkill(skill, level - 1)],
        quests: [],
        achievements: [],
      });
    }
  }
  return requirements;
}

export async function getQuestsWithReqs(
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
      quests: [] as {name: string; page: string}[],
      skills: [] as string[],
    };
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
            requirements.skills.push(formatSkill(skill, level));
          } else {
            ele.find('>a').each((_, a) => {
              const text = $(a).text();
              const page = $(a).attr('href') || '';
              if (!questNames.has(text)) {
                //console.log(text, 'is not a quest.', page);
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
    questsWithReqs.push({
      ...quest,
      ...requirements,
    });
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
    achievements: [] as {name: string; page: string}[],
    quests: [] as {name: string; page: string}[],
    skills: [] as string[],
  };
  element.find('li').each((_, e) => {
    const ele = $(e);
    const html = ele.text() || '';
    console.log(html);
    if (/^\d+\s+\w+/.test(html)) {
      const [level, skill] = html.toLowerCase().split(/\s+\[?/);
      if (!skill || skill.includes(']')) {
        console.log('Nope');
        return;
      }
      requirements.skills.push(formatSkill(skill, level));
    } else {
      console.log('Not skill');
      const title = ele.find('a').attr('title');
      const page = ele.find('a').attr('href') || '';
      if (!title) {
        console.log('Bad element:', html);
        return;
      }
      if (questNames.has(title)) {
        requirements.quests.push({name: title, page});
      } else {
        requirements.achievements.push({name: title, page});
      }
    }
  });
  return requirements;
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
