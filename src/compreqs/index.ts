import axios from 'axios';
import * as cheerio from 'cheerio';
import {URLBuilder} from '../util/url';
import {skillNames, skillNameSet, Skill} from '../rsapi';
import * as moment from 'moment';

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

type RequirementType = 'quest' | 'skill' | 'achievement';

interface Requirement {
  type: RequirementType;
  name: string;
  page: string;
  achievements: {name: string; page: string; type: 'achievement'}[];
  quests: {name: string; page: string; required: boolean; type: 'quest'}[];
  skills: {name: string; page?: string; level: number; type: 'skill'}[];
}

type MappedRequirement = (Requirement & Partial<SkillRequirement>) & {
  priority: number;
  maximumLevelRequirement: number;
  maximumLevelRecommended: number;
  order: number;
};

interface QuestRequirement extends Requirement {
  miniquest: boolean;
}

interface SkillRequirement extends Requirement {
  level: number;
  maximumLevelRequirement: number;
}

let steps: MappedRequirement[];
let lastUpdated = moment(0);
let calculating = false;

export async function getCompletionistCapeSteps() {
  if (await createCompletionistCapeStepsIfNeeded()) {
    while (calculating && !steps) {
      await new Promise(r => setTimeout(r, 15000));
    }
  }
  return steps;
}

async function createCompletionistCapeStepsIfNeeded() {
  if (calculating || (steps && moment().diff(lastUpdated, 'hours') < 4)) {
    return !steps;
  }
  calculating = true;
  (async () => {
    // if (!steps) {
    //   const doc = await (await client).findOne({});
    //   if (doc) {
    //     steps = doc.steps.sort((a, b) => a.order - b.order);
    //   }
    // }

    console.log('Calculating steps...');
    lastUpdated = moment();
    steps = await createCompletionistCapeSteps();
    // await (await client).updateOne(
    //   {},
    //   {
    //     $set: {time: lastUpdated.format(), steps: steps},
    //   },
    //   {upsert: true}
    // );
    console.log('Finished');
    calculating = false;
  })().catch(console.error);
  return false;
}

function getSkillRequirements(): SkillRequirement[] {
  const reqs = [] as SkillRequirement[];
  for (const skill of skillNames) {
    const page = `/w/${skill[0].toUpperCase()}${skill.substring(1)}`;
    const max = skill120s.has(skill) ? 120 : 99;
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

async function createCompletionistCapeSteps(): Promise<MappedRequirement[]> {
  console.log('Gathering data...');
  const rawQuests = [...(await getQuests()), ...(await getMiniquests())];
  const questNames = new Set(rawQuests.map(q => q.name));
  const quests = await getQuestsWithRequirements(rawQuests, questNames);
  const achievements = await getCompletionistCapeAchievementsWithRequirements(
    rawQuests,
    questNames
  );

  //Do this now while it's easier/quicker
  const endReq = achievements.find(
    a => a.name === 'Completionist'
  ) as MappedRequirement;
  if (!endReq) {
    throw new Error('Ending requirement not found!');
  }
  const mqc = {
    type: 'achievement',
    name: 'Master quest cape',
    page: 'Master_quest_cape',
    achievements: [],
    skills: [],
    quests: quests.map(q => ({...q, required: true, type: 'quest'})),
  } as const;
  endReq.achievements.push(mqc);
  let requirements = [...quests, ...achievements, mqc];
  const requirementMap = requirements.reduce((map, requirement) => {
    map.set(requirement.name, requirement as MappedRequirement);
    return map;
  }, new Map<string, MappedRequirement>());

  // console.log('Finding implicit requirements...');
  // addImplicitRequirements(endReq, requirementMap);

  const skills = getSkillRequirements();
  console.log(quests.map(q => q.name).join(', '));
  requirements = [
    ...skills,
    ...quests, //.filter(q => !q.miniquest),
    ...achievements,
    mqc,
  ];

  const skillReqMap = new Map<string, Map<number, MappedRequirement>>();
  skillNames.forEach(name => {
    const levelReqMap = new Map<number, MappedRequirement>();
    skills.forEach(
      s =>
        s.name === name && levelReqMap.set(s.level || 0, s as MappedRequirement)
    );
    skillReqMap.set(name, levelReqMap);
  });

  console.log('Mapping...');
  mapReqOrder(endReq, requirementMap, skillReqMap);
  addMaxLevel(endReq, requirementMap);

  const mappedRequirements = requirements as MappedRequirement[];

  console.log('Sorting...');
  mappedRequirements.sort(
    (a, b) =>
      // (a.type === 'quest' && b.type === 'quest'
      // //   ?
      // requirementDistance(a, b, requirementMap, skillReqMap) -
      //   requirementDistance(b, a, requirementMap, skillReqMap) ||
      // : a.type === 'quest'
      // ? 1
      // : b.type === 'quest'
      // ? -1
      // // : 0) ||
      // (a.maximumLevelRequirement || 0) - (b.maximumLevelRequirement || 0) ||
      // (a.maximumLevelRecommended || 0) - (b.maximumLevelRecommended || 0) ||
      (b.priority || (b.priority = 0)) - (a.priority || (a.priority = 0)) ||
      (a.level || 0) - (b.level || 0)
  );
  mappedRequirements.forEach((r, index) => (r.order = index));
  return mappedRequirements;
}

// function requirementDistance(
//   a: MappedRequirement,
//   b: MappedRequirement,
//   reqMap: Map<string, MappedRequirement>,
//   skillReqMap: Map<string, Map<number, MappedRequirement>>,
//   depth = 1,
//   seen = new Set<string>()
// ): number {
//   const reqs = [...a.quests, ...a.achievements, ...a.skills];
//   if (reqs.find(q => q.name === b.name)) {
//     return depth;
//   }
//   seen.add(a.name);
//   for (const r of reqs.filter(r => !seen.has(r.name))) {
//     const dist = requirementDistance(
//       r.type !== 'skill'
//         ? (reqMap.get(r.name) as MappedRequirement)
//         : ((skillReqMap.get(r.name) as Map<number, MappedRequirement>).get(
//             r.level
//           ) as MappedRequirement),
//       b,
//       reqMap,
//       skillReqMap,
//       depth + 1,
//       seen
//     );
//     if (dist) {
//       return dist;
//     }
//   }
//   return 0;
// }

function addMaxLevel(
  req: MappedRequirement,
  requirementMap: Map<string, MappedRequirement>,
  seen = new Set<string>()
) {
  seen.add(req.name);
  req.maximumLevelRequirement = Math.max(
    ...[
      ...Object.values(req.skills).map(s => s.level),
      ...[...req.quests.filter(q => q.required), ...req.achievements]
        .filter(r => !seen.has(r.name))
        .map(r => {
          const re = requirementMap.get(r.name);
          if (!re) {
            throw new Error('No requirment found for name: ' + r.name);
          }
          if (re.maximumLevelRequirement === undefined) {
            addMaxLevel(re, requirementMap, new Set(Array.from(seen)));
          }
          // if (req.name === 'Nature Spirit') {
          //   console.log(r.name, re.maximumLevelRequirement);
          // }
          return re.maximumLevelRequirement;
        }),
    ]
  );
  req.maximumLevelRecommended = Math.max(
    ...[
      ...Object.values(req.skills).map(s => s.level),
      ...[...req.quests, ...req.achievements]
        .filter(r => !seen.has(r.name))
        .map(r => {
          const re = requirementMap.get(r.name);
          if (!re) {
            throw new Error('No requirment found for name: ' + r.name);
          }
          if (re.maximumLevelRecommended === undefined) {
            addMaxLevel(re, requirementMap, new Set(Array.from(seen)));
          }
          // if (req.name === 'Nature Spirit') {
          //   console.log(r.name, re.maximumLevelRequirement);
          // }
          return re.maximumLevelRecommended;
        }),
    ]
  );
}

type Shortcut = {
  quests: {[name: string]: number};
  achievements: {[name: string]: number};
  skills: {[name: string]: {[level: number]: number}};
};

function mapReqOrder(
  req: MappedRequirement,
  reqs: Map<string, MappedRequirement>,
  levelReqs: Map<string, Map<number, MappedRequirement>>
) {
  const {quests, achievements, skills} = mapShortcut(req, reqs, levelReqs);
  console.log(quests, achievements, skills);
  for (const [name, priority] of [
    ...Object.entries(quests),
    ...Object.entries(achievements),
  ]) {
    const req = reqs.get(name);
    if (!req) {
      throw new Error('No requirement found for ' + name);
    }
    req.priority = (req.priority || 0) + priority;
  }
  for (const [name, levels] of Object.entries(skills)) {
    const skillReqMap = levelReqs.get(name);
    if (!skillReqMap) {
      throw new Error('No skill found for ' + name);
    }
    for (const [level, count] of Object.entries(levels)) {
      for (let i = Number(level); i >= 2; i--) {
        const skill = skillReqMap.get(i);
        if (!skill) {
          console.error('No skill req for', name, i);
          continue;
        }
        skill.priority = (skill.priority || 0) + count;
      }
    }
  }
  // // console.log(`Mapping order, at ${req.name}`);
}

function mergeShortcuts(
  {quests: qA, achievements: aA, skills: sA}: Shortcut,
  {quests: qB, achievements: aB, skills: sB}: Shortcut
) {
  const quests: Shortcut['quests'] = {};
  for (const [name, a] of Object.entries(qA)) {
    quests[name] = a;
  }
  for (const [name, b] of Object.entries(qB)) {
    quests[name] = (quests[name] || 0) + b;
  }
  const achievements: Shortcut['achievements'] = {};
  for (const [name, a] of Object.entries(aA)) {
    achievements[name] = a;
  }
  for (const [name, b] of Object.entries(aB)) {
    achievements[name] = (achievements[name] || 0) + b;
  }
  const skills: Shortcut['skills'] = {};
  for (const [name, levels] of Object.entries(sA)) {
    skills[name] = {};
    const skill = skills[name];
    for (const [level, count] of Object.entries(levels)) {
      skill[Number(level)] = count;
    }
  }
  for (const [name, levels] of Object.entries(sB)) {
    skills[name] = skills[name] || {};
    const skill = skills[name];
    for (const [level, count] of Object.entries(levels)) {
      skill[Number(level)] = (skill[Number(level)] || 0) + count;
    }
  }
  return {quests, achievements, skills};
}

function mapPrereqShortcuts(
  prereqs: {name: string}[],
  reqs: Map<string, MappedRequirement>,
  levelReqs: Map<string, Map<number, MappedRequirement>>,
  stack: string[],
  shortcuts: Map<string, Shortcut>
): Shortcut {
  let shortcut: Shortcut = {quests: {}, achievements: {}, skills: {}};
  for (const {name} of prereqs) {
    const prereq = reqs.get(name);
    if (!prereq) {
      throw new Error('Could not find prereq: ' + name);
    }
    if (stack.includes(name)) {
      // console.log('Skipping mapping of', name);
      continue;
    }
    // console.log('Mapping', name);
    shortcut = mergeShortcuts(
      shortcut,
      mapShortcut(prereq, reqs, levelReqs, Array.from(stack), shortcuts)
    );
  }
  return shortcut;
}

function mapShortcut(
  req: MappedRequirement,
  reqs: Map<string, MappedRequirement>,
  levelReqs: Map<string, Map<number, MappedRequirement>>,
  stack: string[] = [],
  shortcuts = new Map<string, Shortcut>()
): Shortcut {
  if (shortcuts.has(req.name)) {
    return shortcuts.get(req.name) as Shortcut;
  }
  stack.push(req.name);
  const shortcut: Shortcut = mergeShortcuts(
    mapPrereqShortcuts(
      req.quests.filter(q => q.required),
      reqs,
      levelReqs,
      stack,
      shortcuts
    ),
    mapPrereqShortcuts(
      req.achievements || [],
      reqs,
      levelReqs,
      stack,
      shortcuts
    )
  );
  for (const skill of req.skills) {
    const {name, level} = skill;
    shortcut.skills[name] = shortcut.skills[name] || {};
    shortcut.skills[name][level] = (shortcut.skills[name][level] || 0) + 1;
  }
  // if (typeof req.maximumLevelRequirement !== 'number') {
  //   let maximumLevelRequirement = 0;
  //   for (const skill of req.skills) {
  //     maximumLevelRequirement = Math.max(maximumLevelRequirement, skill.level);
  //   }
  //   for (const {name} of [...req.quests, ...req.achievements]) {
  //     const req = reqs.get(name);
  //     if (!req) {
  //       throw new Error('Failed to find requirement for: ' + name);
  //     }
  //     maximumLevelRequirement = Math.max(
  //       maximumLevelRequirement,
  //       req.maximumLevelRequirement
  //     );
  //   }
  //   req.maximumLevelRequirement = maximumLevelRequirement;
  // }
  if (req.type === 'quest') {
    shortcut.quests[req.name] = (shortcut.quests[req.name] || 0) + 1;
  } else {
    shortcut.achievements[req.name] =
      (shortcut.achievements[req.name] || 0) + 1;
  }
  shortcuts.set(req.name, shortcut);
  return shortcut;
}

function addUnmetPrereqRequirements(req: Requirement, prereq: Requirement) {
  for (const quest of prereq.quests) {
    if (req.quests.find(q => q.name === quest.name)) {
      continue;
    }
    req.quests.push({...prereq, required: true, type: 'quest'});
  }
  for (const achiev of prereq.achievements || []) {
    if (
      req.achievements &&
      req.achievements.find(a => a.name === achiev.name)
    ) {
      continue;
    }
    (req.achievements || (req.achievements = [])).push({
      ...prereq,
      type: 'achievement',
    });
  }
  for (const skill of prereq.skills) {
    const reqSkill = req.skills.find(s => s.name === skill.name);
    if (!reqSkill) {
      req.skills.push(skill);
      continue;
    }
    if (reqSkill.level >= skill.level) {
      continue;
    }
    reqSkill.level = skill.level;
  }
}

function calculatePrereqRequirements(
  req: Requirement,
  prereqs: {name: string}[],
  reqs: Map<string, Requirement>
) {
  for (const {name} of prereqs) {
    const prereq = reqs.get(name);
    if (!prereq) {
      throw new Error('Could not find requirement: ' + name);
    }
    addImplicitRequirements(prereq, reqs);
    addUnmetPrereqRequirements(req, prereq);
  }
}

function addImplicitRequirements(
  req: Requirement,
  reqs: Map<string, Requirement>
) {
  calculatePrereqRequirements(req, req.quests, reqs);
  calculatePrereqRequirements(req, req.achievements || [], reqs);
}

async function getQuests() {
  const url = rsWikiUrl.build('/w/List_of_quests');
  console.log('Scraping quest list...');
  const result = await axios.get(url);
  const $ = cheerio.load(result.data);
  const questRows = $('html body div#bodyContent table[width="100%"] tbody');
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

async function getMiniquests() {
  //https://runescape.wiki/w/Miniquests
  const url = rsWikiUrl.build('/w/Miniquests');
  console.log('Scraping miniquest list...');
  const result = await axios.get(url);
  const $ = cheerio.load(result.data);
  const questRows = $('html body div#bodyContent table[width="100%"] tbody');
  const quests: {name: string; page: string; miniquest: true}[] = [];
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
  const questsWithReqs: QuestRequirement[] = [];
  for (const quest of quests) {
    const url = rsWikiUrl.build(quest.page);
    console.log(`Scraping ${url}...`);
    const response = await axios.get(url).catch(() => {
      console.error('FAILED TO LOAD QUEST', quest.name, quest.page);
    });
    if (!response) {
      return questsWithReqs;
    }
    const $ = cheerio.load(response.data);
    const requirement = {
      ...quest,
      type: 'quest',
      quests: [],
      achievements: [],
      skills: [],
    } as QuestRequirement;
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
            if (!skill || !skillNameSet.has(skill as Skill)) {
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
    questsWithReqs.push(requirement);
  }
  return questsWithReqs;
}

async function getCompletionistCapeAchievementsWithRequirements(
  quests: {
    name: string;
    page: string;
    miniquest: boolean;
  }[],
  questNames: Set<string>
) {
  let achievements = await getCompletionistCapeAchievements();
  achievements.push(...taskMasterAchievements);
  const achievementsWithRequirements = [] as Requirement[];
  const index = achievements.findIndex(
    achievement => achievement.name === 'Completionist'
  );
  if (index === -1) {
    throw new Error('No completionist achievement');
  }
  const [completionist] = achievements.splice(index, 1);
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

async function getCompletionistCapeAchievements() {
  const url = rsWikiUrl.build('/w/Completionist_cape');
  console.log('Scraping completionist achievements...');
  const result = await axios.get(url);
  const $ = cheerio.load(result.data);
  const achievementRows = $(
    'html body div#bodyContent table[width="100%"] tbody'
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
    miniquest: boolean;
  }[],
  questNames: Set<string>
): Promise<Requirement> {
  switch (achievement.name) {
    //Ignored because we added its composite achievements
    case 'Task Master':
      return {
        ...achievement,
        achievements: taskMasterAchievements.map(a => ({
          ...a,
          type: 'achievement',
        })),
        skills: [],
        quests: [],
        type: 'achievement',
      };
    case 'Master Quester':
      return {
        ...achievement,
        achievements: [],
        skills: [],
        quests: quests
          .filter(q => !q.miniquest)
          .map(q => ({...q, required: true, type: 'quest'})),
        type: 'achievement',
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
        type: 'achievement',
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
  console.log(`Scraping ${url}...`);
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
      type: 'achievement',
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
      type: 'achievement',
    };
  }
  const requirements = {
    ...achievement,
    achievements: [],
    quests: [],
    skills: [],
    type: 'achievement',
  } as Requirement;
  element.find('li').each((_, e) => {
    const ele = $(e);
    const html = ele.text() || '';
    if (/^\d+\s+\w+/.test(html)) {
      const [level, skill] = html.toLowerCase().split(/\s+\[?/);
      if (!skill || !skillNameSet.has(skill as Skill)) {
        return;
      }
      requirements.skills.push({
        name: skill,
        level: parseInt(level) || 1,
        type: 'skill',
      });
    } else {
      const title = ele.find('a').attr('title');
      const page = ele.find('a').attr('href') || '';
      if (!title) {
        return;
      }
      if (questNames.has(title)) {
        requirements.quests.push({
          name: title,
          page,
          required: true,
          type: 'quest',
        });
      } else if (requirements.achievements && !nonAchievs.has(title)) {
        requirements.achievements.push({
          name: title,
          page,
          type: 'achievement',
        });
      }
    }
  });
  return requirements;
}

const nonAchievs = new Set(['Lunar Spellbook']);
