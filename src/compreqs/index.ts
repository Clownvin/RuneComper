import {RequirementID, getRequirementID} from './requirement';
import {SkillRequirement, getSkillRequirements} from './skills';
import {
  AchievementRequirement,
  getCompletionistCapeAchievementsWithRequirements,
} from './achievements';
import {QuestRequirement, getQuestsAndQuestNames} from './quests';
import {writeFileSync} from 'fs';
import {WIKI_URL_BUILDER} from '../rswiki';

/**
 * TODOs:
 * Barbarian training requires Tai Bwo Wanai Trio and ability to fight mithril dragon
 */
type Requirement = QuestRequirement | SkillRequirement | AchievementRequirement;

type MappedRequirement = Requirement & {
  depth: number;
  maxLevel: number;
  directDependents: Set<RequirementID>;
  indirectDependents: Set<RequirementID>;
};

type GetRequirement = (
  req: Parameters<typeof getRequirementID>[0]
) => MappedRequirement;

function convertToMapped(
  req: Requirement,
  options: Omit<MappedRequirement, keyof Requirement> = {
    depth: -Infinity,
    maxLevel: 0,
    directDependents: new Set(),
    indirectDependents: new Set(),
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
  questCape.add(...quests.map(q => ({...q, required: true})));

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
      throw new Error(`Unknown requirement: ${reqId}`);
    }
    return requirement;
  };

  console.time('depth');
  findMaxDepth(trimmed, getReq);
  console.timeEnd('depth');
  console.time('maxLevel');
  findMaxLevel(trimmed, getReq);
  console.timeEnd('maxLevel');
  console.time('depCount');
  findDependentCounts(trimmed, getReq);
  console.timeEnd('depCount');

  reqsById.set(trimmed.id, trimmed);

  const sorted = Array.from(reqsById)
    .map(
      ([
        ,
        {
          quests,
          skills,
          achievements,
          directDependents,
          indirectDependents,
          page,
          ...req
        },
      ]) => ({
        ...req,
        page: WIKI_URL_BUILDER.build(page),
        directDependents: directDependents.size,
        indirectDependents: indirectDependents.size,
        quests,
        skills,
        achievements,
      })
    )
    .sort(
      (a, b) =>
        a.maxLevel - b.maxLevel ||
        b.depth - a.depth ||
        b.directDependents - a.directDependents ||
        b.indirectDependents - a.indirectDependents ||
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
    case 'achievement':
      return 3;
  }
}

function findMaxLevel(
  req: MappedRequirement,
  getRequirement: GetRequirement,
  seen = new Set<RequirementID>()
) {
  if (seen.has(req.id)) {
    return req.maxLevel;
  }

  seen.add(req.id);

  req.maxLevel = req.map(getRequirement).reduce(
    dep =>
      findMaxLevel(
        dep,
        getRequirement,
        //NOTE: May want to new Set(seen)
        seen
      ),
    {and: Math.max, or: Math.min},
    req.type === 'skill' ? req.level : 0
  );

  return req.maxLevel;
}

// TODO: Slow! Spends a lot of time adding to sets, I think
function findDependentCounts(
  req: MappedRequirement,
  getRequirement: GetRequirement,
  seen = new Set<RequirementID>()
) {
  if (seen.has(req.id)) {
    return;
  }
  seen.add(req.id);

  req.map(getRequirement).forEach(dep => {
    dep.directDependents.add(req.id);
    seen.forEach(id => dep.indirectDependents.add(id));
    findDependentCounts(dep, getRequirement, new Set(seen));
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
    .map(getRequirement)
    .forEach(dep =>
      findMaxDepth(dep, getRequirement, depth + 1, new Set(seen))
    );
}

getRequirements().then(reqs =>
  writeFileSync('./requirements.json', JSON.stringify(reqs, null, 2))
);
