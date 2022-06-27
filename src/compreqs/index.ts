import axios from 'axios';
import cheerio from 'cheerio';
import {URLBuilder} from '../util/url';
import {skillNames, skillNameSet, Skill} from '../rsapi';
import moment from 'moment';
import {concat} from 'lodash';

const rsWikiUrl = new URLBuilder('https://runescape.wiki');

const skill120s = new Set([
  'archaeology',
  'dungeoneering',
  'farming',
  'herblore',
  'invention',
  'slayer',
]);

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
  return calculating;
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
    questNames
  );

  //Do this now while it's easier/quicker
  const endReq = achievements.find(
    a => a.name === 'Trimmed Completionist'
  ) as MappedRequirement;
  const questCape = achievements.find(a => a.name === 'Quest Cape');
  if (!endReq || !questCape) {
    throw new Error('Ending requirement not found!');
  }
  questCape.quests = quests.map(q => ({...q, required: true, type: 'quest'}));
  let requirements = [...quests, ...achievements];
  const requirementMap = requirements.reduce((map, requirement) => {
    map.set(requirement.name, requirement as MappedRequirement);
    return map;
  }, new Map<string, MappedRequirement>());

  const skills = getSkillRequirements();
  console.log(quests.map(q => q.name).join(', '));
  requirements = [
    ...skills,
    ...quests, //.filter(q => !q.miniquest),
    ...achievements,
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
      (a.maximumLevelRequirement || 0) - (b.maximumLevelRequirement || 0) ||
      (a.maximumLevelRecommended || 0) - (b.maximumLevelRecommended || 0) ||
      (b.priority || (b.priority = 0)) - (a.priority || (a.priority = 0)) ||
      (a.level || 0) - (b.level || 0)
  );
  mappedRequirements.forEach((r, index) => (r.order = index));
  return mappedRequirements;
}

function addMaxLevel(
  req: MappedRequirement,
  requirementMap: Map<string, MappedRequirement>,
  seen = new Set<string>()
) {
  seen.add(req.name);
  const requiredLevels = concat(
    Object.values(req.skills).map(s => s.level),
    concat<{name: string}>(
      req.quests.filter(q => q.required),
      req.achievements
    )
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
      })
  );
  // console.log('Required levels for', req.name);
  // console.log(requiredLevels);
  req.maximumLevelRequirement = Math.max(...requiredLevels, 0);
  // console.log(req.maximumLevelRequirement);
  const recommendedLevels = concat(
    Object.values(req.skills).map(s => s.level),
    concat<{name: string}>(req.quests, req.achievements)
      .filter(({name}) => !seen.has(name))
      .map(({name}) => {
        const requirement = requirementMap.get(name);
        if (!requirement) {
          throw new Error('No requirment found for name: ' + name);
        }
        if (requirement.maximumLevelRecommended === undefined) {
          addMaxLevel(requirement, requirementMap, new Set(Array.from(seen)));
        }
        return requirement.maximumLevelRecommended;
      })
  );
  req.maximumLevelRecommended = Math.max(...recommendedLevels, 0);
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
      for (
        let requiredLevel = Number(level);
        requiredLevel >= 2;
        requiredLevel--
      ) {
        const skillRequirement = skillReqMap.get(requiredLevel);
        if (!skillRequirement) {
          console.error('No skill req for', name, requiredLevel);
          continue;
        }
        skillRequirement.priority = (skillRequirement.priority || 0) + count;
      }
    }
  }
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
      continue;
    }
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
  return await Promise.all(
    quests.map(quest => getQuestWithRequirements(quest, questNames))
  );
}

async function getQuestWithRequirements(
  quest: {name: string; page: string; miniquest: boolean},
  questNames: Set<string>
): Promise<QuestRequirement> {
  const url = rsWikiUrl.build(quest.page);
  console.log(`Scraping ${url}...`);
  const response = await axios.get(url);
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
  return requirement;
}

async function getCompletionistCapeAchievementsWithRequirements(
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

async function getCompletionistCapeAchievements() {
  const url = rsWikiUrl.build('/w/Trimmed_Completionist_Cape_(achievement)');
  console.log('Scraping completionist achievements...');
  const result = await axios.get(url);
  const $ = cheerio.load(result.data);
  const achievementRows = $('html body div#bodyContent table.wikitable tbody');
  const achievements: {name: string; page: string}[] = [];
  achievementRows.find('tr').each((_, e) => {
    const a = $(e).find('td a');
    const name = a.attr('title');
    const link = a.attr('href');
    console.log($(e).text());
    if (!name || !link) {
      return;
    }
    achievements.push({
      name: name,
      page: link,
    });
  });
  console.log('Achievements:', achievements);
  achievements.sort((a, b) => a.name.localeCompare(b.name));

  achievements.push({
    name: 'Trimmed Completionist',
    page: '/w/Trimmed_Completionist_Cape_(achievement)',
  });
  return achievements;
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
  const url = rsWikiUrl.build(achievement.page);
  console.log(`Scraping ${url}...`);
  const result = (await axios.get(url).catch(console.error)) || {data: ''};
  const $ = cheerio.load(result.data);
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
    console.log(
      'Achievement has additional achievements',
      achievement.name,
      rsWikiUrl.build(achievement.page)
    );
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
            console.log('DOING SET TASKS', requirement.name);
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
              // console.log($(e).text());
              console.log(name, rsWikiUrl.build(page));
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
      if (!skill || !skillNameSet.has(skill as Skill)) {
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
        // if (title.startsWith('Completionist')) {
        //   console.log(ele.text());
        // }
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

createCompletionistCapeStepsIfNeeded();

const nonAchievs = new Set(['Lunar Spellbook']);
