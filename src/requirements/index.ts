import {RequirementID, getRequirementID} from './requirement';
import {SkillRequirement, getSkillRequirements} from './skills';
import {
  AchievementRequirement,
  getCompletionistCapeAchievementsWithRequirements,
} from './achievements';
import {QuestRequirement, getQuestsAndQuestNames} from './quests';
import {WIKI_URL_BUILDER} from '../rswiki';
import {CombatRequirement} from './combat';
import {avgLevelForCombatLvl} from '../model/runescape';
import {omit} from 'lodash';
// import {AndOrMap} from '../util/andOrMap';

/**
 * TODOs:
 * Barbarian training requires Tai Bwo Wanai Trio and ability to fight mithril dragon
 */
type Requirement =
  | QuestRequirement
  | SkillRequirement
  | AchievementRequirement
  | CombatRequirement;

type MappedRequirement = Requirement & {
  depth: number;
  depthRecommended: number;
  maxLevel: number;
  maxLevelRecommended: number;
  directDependents: Set<RequirementID>;
  directDependentsRecommended: Set<RequirementID>;
  indirectDependents: Set<RequirementID>;
  indirectDependentsRecommended: Set<RequirementID>;
};

type GetRequirement = (
  req: Parameters<typeof getRequirementID>[0]
) => MappedRequirement;

function convertToMapped(
  req: Requirement,
  options: Omit<MappedRequirement, keyof Requirement> = {
    depth: -Infinity,
    depthRecommended: -Infinity,
    maxLevel: 0,
    maxLevelRecommended: 0,
    directDependents: new Set(),
    directDependentsRecommended: new Set(),
    indirectDependents: new Set(),
    indirectDependentsRecommended: new Set(),
  }
): MappedRequirement {
  return Object.assign(req, options);
}

export async function getRequirements() {
  const {quests, questNames, miniquestNames} = await getQuestsAndQuestNames();
  const {trimmed: t, achievements} =
    await getCompletionistCapeAchievementsWithRequirements(
      questNames,
      miniquestNames
    );
  const questCape = achievements.find(a => a.name === 'Quest Cape');
  if (!questCape) {
    throw new Error('Failed to find Quest Cape requirement');
  }

  //TODO: Currently adding all quests to Quest Cape,
  //should be adding to MQC and True Trim, etc
  questCape.addRequired(...quests.map(q => ({...q, required: true})));

  const trimmed = convertToMapped(t);
  const skills = await getSkillRequirements();

  const reqsById = new Map<RequirementID, MappedRequirement>();
  for (const req of [...skills, ...quests, ...achievements]) {
    reqsById.set(req.id, convertToMapped(req));
  }

  const getReq: Parameters<typeof findMaxDepth>[1] = req => {
    const reqId = getRequirementID(req);
    const requirement = reqsById.get(reqId);
    if (!requirement) {
      if (req.type === 'combat') {
        let requirement: MappedRequirement;
        reqsById.set(
          reqId,
          (requirement = convertToMapped(new CombatRequirement(req.level)))
        );
        return requirement;
      }
      throw new Error(`Unknown requirement: ${reqId}`);
    }
    return requirement;
  };

  console.time('depth');
  findMaxDepth(trimmed, getReq);
  console.timeEnd('depth');
  console.time('maxLevel');
  findMaxLevels(trimmed, getReq);
  console.timeEnd('maxLevel');
  console.time('depCount');
  findDependentCounts(trimmed, getReq);
  console.timeEnd('depCount');

  reqsById.set(trimmed.id, trimmed);

  const sorted = Array.from(reqsById)
    .map(([, req]) => ({
      ...omit(
        req,
        'required',
        'recommended',
        'depthRecommended',
        'directDependentsRecommended',
        'indirectDependentsRecommended'
      ),
      page: WIKI_URL_BUILDER.build(req.page),
      directDependents: req.directDependents.size,
      indirectDependents: req.indirectDependents.size,
      quests: req.getQuests(true),
      skills: req.getSkills(true),
      achievements: req.getAchievements(true),
    }))
    .sort(
      (a, b) =>
        a.maxLevel - b.maxLevel ||
        b.directDependents - a.directDependents ||
        b.indirectDependents - a.indirectDependents ||
        a.maxLevelRecommended - b.maxLevelRecommended ||
        b.depth - a.depth ||
        typePriority(a.type) - typePriority(b.type) ||
        a.name.localeCompare(b.name)
    );

  const seen = new Set<RequirementID>();

  for (const req of sorted) {
    seen.add(req.id);
    const prereqsNotSeenYet = [
      ...req.skills,
      ...req.achievements,
      ...req.quests,
    ]
      .map(getRequirementID)
      .filter(id => !seen.has(id));
    if (prereqsNotSeenYet.length) {
      console.error(`${req.id} occurs before: ${prereqsNotSeenYet.join(', ')}`);
    }
  }

  return sorted;
}

function typePriority(type: Requirement['type']) {
  switch (type) {
    case 'quest':
      return 1;
    case 'skill':
      return 2;
    case 'combat':
      return 3;
    case 'achievement':
      return 3;
  }
}

function findMaxLevels(
  req: MappedRequirement,
  getRequirement: GetRequirement,
  seen = new Set<RequirementID>()
) {
  if (seen.has(req.id)) {
    return req;
  }

  seen.add(req.id);

  function helper(reqs: typeof req['required'], recommended: boolean) {
    return reqs.map(getRequirement).reduce(
      dep => {
        const levels = findMaxLevels(
          dep,
          getRequirement,
          //NOTE: May want to new Set(seen)
          seen
        );
        if (recommended) {
          return levels.maxLevelRecommended;
        } else {
          return levels.maxLevel;
        }
      },
      {and: Math.max, or: Math.min},
      req.type === 'skill'
        ? req.level
        : req.type === 'combat'
        ? avgLevelForCombatLvl(req.level)
        : 0
    );
  }

  req.maxLevel = helper(req.required, false);
  req.maxLevelRecommended = Math.max(
    req.maxLevel,
    helper(req.recommended, true)
  );

  return req;
}

// TODO: Slow! Spends a lot of time adding to sets, I think
function findDependentCounts(
  req: MappedRequirement,
  getRequirement: GetRequirement,
  seen = new Set<RequirementID>(),
  depth = 0
) {
  if (seen.has(req.id)) {
    return;
  }
  seen.add(req.id);

  req
    .map((dep, required) => [getRequirement(dep), required] as const)
    .forEach(([dep, required]) => {
      if (required) {
        if (
          dep.directDependents.has(req.id) &&
          Array.from(seen).every(id => dep.indirectDependents.has(id))
        ) {
          return;
        }
        dep.directDependents.add(req.id);
        seen.forEach(id => dep.indirectDependents.add(id));
      } else {
        if (
          dep.directDependentsRecommended.has(req.id) &&
          Array.from(seen).every(id =>
            dep.indirectDependentsRecommended.has(id)
          )
        ) {
          return;
        }
        dep.directDependentsRecommended.add(req.id);
        seen.forEach(id => dep.indirectDependentsRecommended.add(id));
      }
      findDependentCounts(dep, getRequirement, new Set(seen), depth + 1);
    });
}

function findMaxDepth(
  req: MappedRequirement,
  getRequirement: (
    req: Parameters<typeof getRequirementID>[0]
  ) => MappedRequirement,
  depth = 0,
  seen = new Set<RequirementID>()
): void {
  if (seen.has(req.id) || req.depth >= depth) {
    return;
  }

  req.depth = depth;
  seen.add(req.id);

  return req
    .map(req => getRequirement(req))
    .forEach(dep =>
      findMaxDepth(dep, getRequirement, depth + 1, new Set(seen))
    );
}
