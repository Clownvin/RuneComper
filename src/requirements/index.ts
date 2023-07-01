import {
  IAchievement,
  IQuest,
  ISKillBoostable,
  RequirementID,
  Type,
  getRequirementID,
} from './requirement';
import {SkillRequirement, getSkillRequirements} from './skills';
import {
  AchievementRequirement,
  getCompletionistCapeAchievementsWithRequirements,
} from './achievements';
import {QuestRequirement, getQuestsAndQuestNames} from './quests';
import {WIKI_URL_BUILDER} from '../rswiki';
import {CombatRequirement} from './combat';
import {
  Skill,
  avgLevelForCombatLvl,
  isSkill as isSkillName,
} from '../model/runescape';
import {omit} from 'lodash';
import {DefaultMap} from '../util/collections/defaultMap';
import {getImageFromPage} from '../rswiki/util';
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

type TraversedRequirement = Requirement & {
  depth: number;
  depthRecommended: number;
  maxLevel: number;
  maxLevelRecommended: number;
  directDependents: Set<RequirementID>;
  directDependentsRecommended: Set<RequirementID>;
  indirectDependents: Set<RequirementID>;
  indirectDependentsRecommended: Set<RequirementID>;
};

type MappedRequirement = Omit<
  TraversedRequirement,
  | 'required'
  | 'recommended'
  | 'depthRecommended'
  | 'directDependents'
  | 'indirectDependents'
  | 'directDependentsRecommended'
  | 'indirectDependentsRecommended'
> & {
  page: string;
  directDependents: number;
  indirectDependents: number;
  quests: IQuest[];
  skills: ISKillBoostable[];
  achievements: IAchievement[];
};

type MappedSkillRequirement = Omit<MappedRequirement, 'type'> & {
  type: 'skill';
  level: number;
};

type GetRequirement = (
  req: Parameters<typeof getRequirementID>[0]
) => TraversedRequirement;

function convertToMapped(
  req: Requirement,
  options: Omit<TraversedRequirement, keyof Requirement> = {
    depth: -Infinity,
    depthRecommended: -Infinity,
    maxLevel: 0,
    maxLevelRecommended: 0,
    directDependents: new Set(),
    directDependentsRecommended: new Set(),
    indirectDependents: new Set(),
    indirectDependentsRecommended: new Set(),
  }
): TraversedRequirement {
  return Object.assign(req, options);
}

export async function getRequirements() {
  const combatLevelIcon = await getImageFromPage('/w/Combat');
  const {quests, questNames, miniquestNames} = await getQuestsAndQuestNames(
    combatLevelIcon
  );
  const {trimmed, achievements} =
    await getCompletionistCapeAchievementsWithRequirements(
      questNames,
      miniquestNames
    );

  const questCape = new AchievementRequirement({
    name: 'Quest Cape',
    page: '/w/Quest_Cape',
    icon: '',
    required: quests.map(q => ({...q, required: true})),
  });

  const trueTrimmed = convertToMapped(
    new AchievementRequirement({
      name: 'True Trim',
      page: '/w/True_trim',
      icon: '',
      required: [questCape, trimmed],
    })
  );
  const skills = await getSkillRequirements();

  const reqsById = new Map<RequirementID, TraversedRequirement>();
  for (const req of [
    ...skills,
    ...quests,
    ...achievements,
    questCape,
    trimmed,
    trueTrimmed,
  ]) {
    reqsById.set(req.id, convertToMapped(req));
  }

  const getReq: Parameters<typeof findMaxDepth>[1] = req => {
    const reqId = getRequirementID(req);
    const requirement = reqsById.get(reqId);
    if (!requirement) {
      if (req.type === 'combat') {
        let requirement: TraversedRequirement;
        reqsById.set(
          reqId,
          (requirement = convertToMapped(
            new CombatRequirement(combatLevelIcon, req.level)
          ))
        );
        return requirement;
      }
      throw new Error(`Unknown requirement: ${reqId}`);
    }
    return requirement;
  };

  console.time('depth');
  findMaxDepth(trueTrimmed, getReq);
  console.timeEnd('depth');
  console.time('maxLevel');
  findMaxLevels(trueTrimmed, getReq);
  console.timeEnd('maxLevel');
  console.time('depCount');
  findDependentCounts(trueTrimmed, getReq);
  console.timeEnd('depCount');

  const sorted: (MappedRequirement | MappedSkillRequirement)[] = Array.from(
    reqsById
  )
    .map(([, req]) => ({
      ...omit(
        req,
        'required',
        'recommended',
        'depthRecommended',
        'directDependents',
        'indirectDependents',
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
    .map(req => ({...req, priority: priorityA(req)}))
    .sort(
      (a, b) =>
        b.depth - a.depth ||
        a.maxLevel - b.maxLevel ||
        a.maxLevelRecommended - b.maxLevelRecommended ||
        b.indirectDependents - a.indirectDependents ||
        b.directDependents - a.directDependents ||
        typePriority(a.type) - typePriority(b.type) ||
        a.name.localeCompare(b.name)
    );

  // combineSkillRanges(sorted);

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

type SkillRanges = DefaultMap<Skill, SkillAndIndex[]>;

type SkillAndIndex = [req: MappedSkillRequirement, index: number];

type Requirements = (MappedRequirement | MappedSkillRequirement)[];

function combineSkillRanges(requirements: Requirements) {
  const skillRanges: SkillRanges = new DefaultMap(() => []);

  for (let i = 0; i < requirements.length; i++) {
    const req = requirements[i];
    if (req.type === 'skill' && isSkillName(req.name) && 'level' in req) {
      req.level;
      skillRanges.get(req.name).push([req, i]);
      continue;
    }
    const {skills: reqSkills} = req;
    if (!reqSkills.length) {
      continue;
    }
    const prevR = requirements.length;
    const prevI = i;
    i -= combineSkillRangesBeforeRequirement(
      skillRanges,
      reqSkills,
      requirements
    );
    console.log(prevR - requirements.length, prevI - i);
  }

  for (const [, range] of skillRanges) {
    if (!range.length) {
      continue;
    }
    const [lastSkill] = range[range.length - 1];
    mergeRangeAndSpliceRequirements(
      lastSkill,
      range,
      skillRanges,
      requirements,
      range.length - 1
    );
  }
}

function combineSkillRangesBeforeRequirement(
  skillRanges: SkillRanges,
  reqSkills: ISKillBoostable[],
  requirements: Requirements
) {
  let totalRemoved = 0;
  for (const reqSkill of reqSkills) {
    const skillRange = skillRanges.get(reqSkill.name);
    if (!skillRange.length) {
      continue;
    }
    const {level: reqLevel} = reqSkill;
    for (let i = 0; i < skillRange.length; i++) {
      const [skill] = skillRange[i];
      const {level: skillLevel} = skill;
      if (skillLevel > reqLevel) {
        break;
      }
      if (skillLevel < reqLevel) {
        continue;
      }
      mergeRangeAndSpliceRequirements(
        skill,
        skillRange,
        skillRanges,
        requirements,
        i
      );
      totalRemoved += i;
      break;
    }
  }
  return totalRemoved;
}

function mergeRangeAndSpliceRequirements(
  skillReq: MappedSkillRequirement,
  range: SkillAndIndex[],
  skillRanges: SkillRanges,
  requirements: Requirements,
  skillReqIndex: number
) {
  // Update the ending skill requirement with start/end info
  Object.assign(range[0][0], {
    id: skillReq.id,
    level: skillReq.level,
    startLevel: range[0][0].level,
    endLevel: skillReq.level,
  });
  const indexes = new DefaultMap<Skill, number>(() => 0);
  // Until we reach the end skill's index (the index of "skill")
  for (let i = 1; i <= skillReqIndex; i++) {
    const [_, index] = range[i];
    // Remove the current index, since we're merging it
    requirements.splice(index, 1);
    // Then, for each of the skill ranges we're tracking...
    for (const [skill, range] of skillRanges) {
      // Starting where we left off with each skill, or at 0
      for (let i = indexes.get(skill); i < range.length; i++) {
        const [otherSkill, otherIndex] = range[i];
        // If this other skill is before what we removed
        if (otherIndex <= index) {
          // Increment our start for next time, continue
          indexes.set(skill, i + 1);
          continue;
        }
        // Otherwise, decrement the index (since we just removed)
        range[i] = [otherSkill, otherIndex - 1];
      }
    }
  }
  // Remove the skills we just merged into a range from the skillRanges
  range.splice(0, skillReqIndex + 1);
}

function calcWeight(weights: [val: number, weight: number][]) {
  const totalWeight = weights.reduce((total, [, weight]) => total + weight, 0);
  return weights.reduce(
    (total, [val, weight]) => total + val * (weight / totalWeight),
    0
  );
}

function priorityA(req: {
  depth: number;
  indirectDependents: number;
  maxLevelRecommended: number;
  maxLevel: number;
  directDependents: number;
  type: Type;
  name: string;
}) {
  return calcWeight([
    [req.depth, 10000],
    [req.indirectDependents, 50],
    [req.maxLevelRecommended, 50],
    [req.maxLevel, 0],
    [req.directDependents, 0],
    [5 - typePriority(req.type), 0],
  ]);
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
  req: TraversedRequirement,
  getRequirement: GetRequirement,
  seen = new Set<RequirementID>()
) {
  if (seen.has(req.id)) {
    return req;
  }

  seen.add(req.id);

  function helper(reqs: (typeof req)['required'], recommended: boolean) {
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
  req: TraversedRequirement,
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
  req: TraversedRequirement,
  getRequirement: (
    req: Parameters<typeof getRequirementID>[0]
  ) => TraversedRequirement,
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
