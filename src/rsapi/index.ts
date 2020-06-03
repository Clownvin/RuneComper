import * as superagent from 'superagent';
import {URLBuilder} from '../util/url';

export enum Skill {
  ATTACK = 'attack',
  DEFENCE = 'defence',
  STRENGTH = 'strength',
  CONSTITUTION = 'constitution',
  RANGED = 'ranged',
  PRAYER = 'prayer',
  MAGIC = 'magic',
  COOKING = 'cooking',
  WOODCUTTING = 'woodcutting',
  FLETCHING = 'fletching',
  FISHING = 'fishing',
  FIREMAKING = 'firemaking',
  CRAFTING = 'crafting',
  SMITHING = 'smithing',
  MINING = 'mining',
  HERBLORE = 'herblore',
  AGILITY = 'agility',
  THIEVING = 'thieving',
  SLAYER = 'slayer',
  FARMING = 'farming',
  RUNECRAFTING = 'runecrafting',
  HUNTER = 'hunter',
  CONSTRUCTION = 'construction',
  SUMMONING = 'summoning',
  DUNGEONEERING = 'dungeoneering',
  DIVINATION = 'divination',
  INVENTION = 'invention',
  ARCHAEOLOGY = 'archaeology',
}

//Ordered by RuneScape ID
export const skillNames: Skill[] = [
  Skill.ATTACK,
  Skill.DEFENCE,
  Skill.STRENGTH,
  Skill.CONSTITUTION,
  Skill.RANGED,
  Skill.PRAYER,
  Skill.MAGIC,
  Skill.COOKING,
  Skill.WOODCUTTING,
  Skill.FLETCHING,
  Skill.FISHING,
  Skill.FIREMAKING,
  Skill.CRAFTING,
  Skill.SMITHING,
  Skill.MINING,
  Skill.HERBLORE,
  Skill.AGILITY,
  Skill.THIEVING,
  Skill.SLAYER,
  Skill.FARMING,
  Skill.RUNECRAFTING,
  Skill.HUNTER,
  Skill.CONSTRUCTION,
  Skill.SUMMONING,
  Skill.DUNGEONEERING,
  Skill.DIVINATION,
  Skill.INVENTION,
  Skill.ARCHAEOLOGY,
];
const skillIdToNameMap = new Map<number, Skill>();
skillNames.forEach((name, id) => skillIdToNameMap.set(id, name));
export const skillNameSet = new Set(skillNames);

interface ProfileActivity {
  date: string;
  details: string;
  text: string;
}

interface ProfileSkill {
  level: number;
  xp: number;
  rank: number;
  id: number;
}

interface RunemetricsProfile {
  magic: number;
  questsstarted: number;
  totalskill: number;
  questscomplete: number;
  questsnotstarted: number;
  totalxp: number;
  ranged: number;
  activities: ProfileActivity[];
  skillvalues: ProfileSkill[];
  name: string;
  rank: string;
  melee: number;
  combatlevel: number;
  loggedIn: string;
}

type QuestStatus = 'NOT_STARTED' | 'STARTED' | 'COMPLETED';

interface RunemetricsQuest {
  title: string;
  status: QuestStatus;
  difficulty: number;
  members: boolean;
  questPoints: number;
  userEligible: boolean;
}

const rmUrl = new URLBuilder('https://apps.runescape.com/runemetrics/');

async function getProfile(
  user: string
): Promise<{
  name: string;
  totallevel: number;
  totalxp: number;
  loggedIn: boolean;
  skills: {[x in Skill]: {level: number; xp: number}};
}> {
  const {body} = await superagent.get(rmUrl.build('profile/profile', {user}));
  if (!body || !body.skillvalues) {
    throw new Error(`No profile found for user: ${user}. Is it private?`);
  }
  const userProfile = body as RunemetricsProfile;
  //change them to be indexed by name, and remove unecessary fields
  const skills = userProfile.skillvalues.reduce(
    (skills, skill) => {
      const name = skillIdToNameMap.get(skill.id);
      if (name === undefined) {
        return skills;
      }
      skills[name] = {
        level: skill.level,
        xp: skill.xp,
      };
      return skills;
    },
    {} as {
      [key in Skill]: {level: number; xp: number};
    }
  );
  //return only the info we're interested in
  return {
    name: userProfile.name,
    totallevel: userProfile.totalskill,
    totalxp: userProfile.totalxp,
    loggedIn: userProfile.loggedIn === 'true',
    skills,
  };
}

async function getQuests(user: string) {
  const {body} = await superagent.get(rmUrl.build('quests', {user}));
  if (!body) {
    throw new Error(`No quests found for user: ${user}. Is it private?`);
  }
  const quests = body.quests as RunemetricsQuest[];
  //change them to be indexed by title, and remove unecessary fields
  return quests.reduce((quests, quest) => {
    if (quest.title === 'Tears of Guthix') {
      quest.title = 'Tears of Guthix (quest)';
    }
    quests[quest.title] = {
      completed: quest.status === 'COMPLETED',
      userEligible: quest.userEligible,
    };
    return quests;
  }, {} as {[x: string]: {completed: boolean; userEligible: boolean}});
}

export interface ProfileWithQuests {
  name: string;
  totallevel: number;
  totalxp: number;
  loggedIn: boolean;
  skills: {[x in Skill]: {level: number; xp: number}};
  quests: {[x: string]: {completed: boolean; userEligible: boolean}};
}

async function getProfileWithQuests(user: string): Promise<ProfileWithQuests> {
  return {
    ...(await getProfile(user)),
    quests: await getQuests(user),
  };
}

export default {
  getProfile,
  getQuests,
  getProfileWithQuests,
};
