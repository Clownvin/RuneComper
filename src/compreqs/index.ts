import {RequirementID, getRequirementID} from './requirement';
import {SkillRequirement, getSkillRequirements} from './skills';
import {
  AchievementRequirement,
  getCompletionistCapeAchievementsWithRequirements,
} from './achievements';
import {QuestRequirement, getQuestsAndQuestNames} from './quests';
import {writeFileSync} from 'fs';

/**
 * TODOs:
 * Barbarian training requires Tai Bwo Wanai Trio and ability to fight mithril dragon
 */
type Requirement = QuestRequirement | SkillRequirement | AchievementRequirement;

type MappedRequirement = Requirement & {
  depthFromRoot: number;
  maxLevel: number;
  directDependents: Set<RequirementID>;
  indirectDependents: Set<RequirementID>;
  directRequirements: Set<RequirementID>;
  indirectRequirements: Set<RequirementID>;
  // directDependents: MappedRequirement[];
  // indirectDependents: MappedRequirement[];
};

type GetRequirement = (
  req: Parameters<typeof getRequirementID>[0]
) => MappedRequirement;

function convertToMapped(
  req: Requirement,
  options: Omit<MappedRequirement, keyof Requirement> = {
    depthFromRoot: -Infinity,
    maxLevel: 0,
    directDependents: new Set(),
    indirectDependents: new Set(),
    directRequirements: new Set(),
    indirectRequirements: new Set(),
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

  findMaxDepth(trimmed, getReq);
  findMaxLevel(trimmed, getReq);
  findDependentCounts(trimmed, getReq);

  reqsById.set(trimmed.id, trimmed);

  return Array.from(reqsById)
    .map(
      ([
        ,
        {
          quests,
          skills,
          achievements,
          directDependents,
          indirectDependents,
          directRequirements,
          indirectRequirements,
          ...req
        },
      ]) => ({
        ...req,
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
        b.directDependents - a.directDependents ||
        b.indirectDependents - a.indirectDependents ||
        b.depthFromRoot - a.depthFromRoot ||
        typePriority(a.type) - typePriority(b.type) ||
        a.name.localeCompare(b.name)
    );
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
  console.log('Finding max level:', req.id);
  seen.add(req.id);

  req.maxLevel = req
    .map(getRequirement)
    .reduce(
      dep => findMaxLevel(dep, getRequirement, seen),
      {and: Math.max, or: Math.min},
      req.type === 'skill' ? req.level : 0
    );

  return req.maxLevel;
}

/*
a0
|\
b1 c1
|
c2

c: 2(3)
b: 1(1)
a: 0(0)
*/
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
    findDependentCounts(dep, getRequirement, new Set(Array.from(seen)));
  });
}

// function findRequirementCounts(
//   req: MappedRequirement,
//   getRequirement: GetRequirement,
//   seen = new Set<RequirementID>()
// ) {}

function findMaxDepth(
  req: MappedRequirement,
  getRequirement: (
    req: Parameters<typeof getRequirementID>[0]
  ) => MappedRequirement,
  depth = 0,
  seen = new Set<RequirementID>()
): void {
  if (seen.has(req.id) || req.depthFromRoot >= depth) {
    return;
  }
  console.log('Finding depth:', req.id, depth);

  req.depthFromRoot = depth;
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
