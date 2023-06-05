import moment from 'moment';
import {concat} from 'lodash';
import {existsSync, readFileSync, writeFileSync} from 'fs';
import {Requirement} from './requirement';
import {SkillRequirement, getSkillRequirements} from './skills';
import {
  AchievementRequirement,
  getCompletionistCapeAchievementsWithRequirements,
} from './achievements';
import {QuestRequirement, getQuestsAndQuestNames} from './quests';
import {SKILLS} from '../model/runescape';

/**
 * TODOs:
 * Barbarian training requires Tai Bwo Wanai Trio and ability to fight mithril dragon
 */

type MappedRequirement = (
  | AchievementRequirement
  | QuestRequirement
  | SkillRequirement
) & {
  priority: number;
  maximumLevelRequirement: number;
  maximumLevelRecommended: number;
  order: number;
};

let steps: MappedRequirement[] = existsSync('./requirements.json')
  ? JSON.parse(readFileSync('./requirements.json').toString())
  : undefined;
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
    writeFileSync(
      './requirements.json',
      JSON.stringify(
        steps
          .sort((a, b) => a.order - b.order)
          .map(s => ({
            ...s,
            requirements: s.requirements,
          })),
        null,
        2
      )
    );
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

async function createCompletionistCapeSteps(): Promise<MappedRequirement[]> {
  console.log('Gathering data...');

  const {quests, questNames} = await getQuestsAndQuestNames();
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
  questCape.remove(q => !('and' in q || 'or' in q) && q.type === 'quest');
  questCape.add(
    ...quests.map(q => ({...q, required: true, type: 'quest' as const}))
  );
  let requirements = [...quests, ...achievements];
  const requirementMap = requirements.reduce((map, requirement) => {
    map.set(requirement.name, requirement as MappedRequirement);
    return map;
  }, new Map<string, MappedRequirement>());

  const skills = await getSkillRequirements();
  requirements = [
    ...skills,
    ...quests, //.filter(q => !q.miniquest),
    ...achievements,
  ];

  const skillReqMap = new Map<string, Map<number, MappedRequirement>>();
  SKILLS.forEach(skill => {
    const levelReqMap = new Map<number, MappedRequirement>();
    skills.forEach(
      s =>
        s.name === skill &&
        levelReqMap.set(s.level || 0, s as MappedRequirement)
    );
    skillReqMap.set(skill, levelReqMap);
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
      (a.type === 'skill' ? a.level : 0) - (b.type === 'skill' ? b.level : 0)
  );
  mappedRequirements.forEach((r, index) => (r.order = index));
  // console.log('Quest names:', uniq(requirements.map(r => r.name)));
  return mappedRequirements;
}

//TODO: Move this (and similar) to requirements. Calculate max level for each
//distinct logical unit of "OR"s and then pick the lowest for its max
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
          throw new Error('No requirement found for name: ' + r.name);
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
          throw new Error('No requirement found for name: ' + name);
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
  prereqs: readonly {name: string}[],
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
    req.add({...prereq, required: true, type: 'quest', miniquest: false});
  }
  for (const achieve of prereq.achievements || []) {
    if (
      req.achievements &&
      req.achievements.find(a => a.name === achieve.name)
    ) {
      continue;
    }
    req.add({
      ...prereq,
      type: 'achievement',
    });
  }
  for (const skill of prereq.skills) {
    const reqSkill = req.skills.find(s => s.name === skill.name);
    if (!reqSkill) {
      req.add(skill);
      continue;
    }
    if (reqSkill.level >= skill.level) {
      continue;
    }
    // reqSkill.level = skill.level;
  }
}

function calculatePrereqRequirements(
  req: Requirement,
  prereqs: readonly {name: string}[],
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

createCompletionistCapeStepsIfNeeded();
