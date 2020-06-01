import * as superagent from 'superagent';
import {URLBuilder} from '../util/url';

export enum Skills {
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
  COMBAT = 'combat',
}

//Ordered by RuneScape ID
export const skillNames: Skills[] = [
  Skills.ATTACK,
  Skills.DEFENCE,
  Skills.STRENGTH,
  Skills.CONSTITUTION,
  Skills.RANGED,
  Skills.PRAYER,
  Skills.MAGIC,
  Skills.COOKING,
  Skills.WOODCUTTING,
  Skills.FLETCHING,
  Skills.FISHING,
  Skills.FIREMAKING,
  Skills.CRAFTING,
  Skills.SMITHING,
  Skills.MINING,
  Skills.HERBLORE,
  Skills.AGILITY,
  Skills.THIEVING,
  Skills.SLAYER,
  Skills.FARMING,
  Skills.RUNECRAFTING,
  Skills.HUNTER,
  Skills.CONSTRUCTION,
  Skills.SUMMONING,
  Skills.DUNGEONEERING,
  Skills.DIVINATION,
  Skills.INVENTION,
  Skills.ARCHAEOLOGY,
  Skills.COMBAT,
];
const skillIdToNameMap = new Map<number, Skills>();
skillNames.forEach((name, id) => skillIdToNameMap.set(id, name));

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
  title: QuestName;
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
  skills: {[x in Skills]: {level: number; xp: number}};
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
    {combat: {level: userProfile.combatlevel, xp: 200000000}} as {
      [key in Skills]: {level: number; xp: number};
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
  }, {} as {[key in QuestName]: {completed: boolean; userEligible: boolean}});
}

export interface ProfileWithQuests {
  name: string;
  totallevel: number;
  totalxp: number;
  loggedIn: boolean;
  skills: {[x in Skills]: {level: number; xp: number}};
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

type QuestName =
  | 'Big Chompy Bird Hunting'
  | 'Broken Home'
  | 'Buyers and Cellars'
  | 'Clock Tower'
  | "Cook's Assistant"
  | 'Death Plateau'
  | 'Demon Slayer'
  | 'Dragon Slayer'
  | 'Druidic Ritual'
  | 'Dwarf Cannon'
  | 'Elemental Workshop I'
  | 'Elemental Workshop II'
  | 'Ernest the Chicken'
  | 'Fight Arena'
  | 'Fishing Contest'
  | 'From Tiny Acorns (miniquest)'
  | 'Goblin Diplomacy'
  | "Gunnar's Ground"
  | 'Imp Catcher'
  | 'The Blood Pact'
  | 'Unstable Foundations'
  | 'A Shadow over Ashdale'
  | 'Call of the Ancestors'
  | 'Lost Her Marbles (miniquest)'
  | "'Phite Club"
  | 'A Clockwork Syringe'
  | 'A Fairy Tale I - Growing Pains'
  | 'A Fairy Tale II - Cure a Queen'
  | "A Fairy Tale III - Battle at Ork's Rift"
  | 'A Guild of Our Own (miniquest)'
  | "A Soul's Bane"
  | 'A Tail of Two Cats'
  | 'A Void Dance'
  | 'Abyss (miniquest)'
  | 'All Fired Up'
  | 'Animal Magnetism'
  | 'Another Slice of H.A.M.'
  | 'As a First Resort'
  | 'Back to my Roots'
  | 'Back to the Freezer'
  | 'Bar Crawl (miniquest)'
  | 'Beneath Cursed Tides'
  | "Benedict's World Tour (miniquest)"
  | 'Between a Rock...'
  | 'Biohazard'
  | 'Birthright of the Dwarves'
  | 'Blood Runs Deep'
  | "Boric's Task I (miniquest)"
  | "Boric's Task II (miniquest)"
  | "Boric's Task III (miniquest)"
  | 'Bringing Home the Bacon'
  | 'Cabin Fever'
  | 'Carnillean Rising'
  | 'Catapult Construction'
  | "Chef's Assistant"
  | 'Children of Mah'
  | 'Cold War'
  | 'Contact!'
  | 'Creature of Fenkenstrain'
  | 'Crocodile Tears'
  | 'Curse of the Black Stone'
  | 'Damage Control (miniquest)'
  | 'Deadliest Catch'
  | 'Dealing with Scabaras'
  | 'Death to the Dorgeshuun'
  | 'Defender of Varrock'
  | 'Desert Slayer Dungeon (miniquest)'
  | 'Desert Treasure'
  | 'Desperate Times'
  | 'Devious Minds'
  | 'Diamond in the Rough'
  | 'Dimension of Disaster'
  | 'Dimension of Disaster: Coin of the Realm'
  | 'Dimension of Disaster: Curse of Arrav'
  | 'Dimension of Disaster: Defender of Varrock'
  | 'Dimension of Disaster: Demon Slayer'
  | 'Dimension of Disaster: Shield of Arrav'
  | 'Dishonour among Thieves'
  | 'Do No Evil'
  | "Doric's Task I (miniquest)"
  | "Doric's Task II (miniquest)"
  | "Doric's Task III (miniquest)"
  | "Doric's Task IV (miniquest)"
  | "Doric's Task V (miniquest)"
  | "Doric's Task VI (miniquest)"
  | "Doric's Task VII (miniquest)"
  | "Doric's Task VIII (miniquest)"
  | 'Dream Mentor'
  | "Eadgar's Ruse"
  | "Eagles' Peak"
  | 'Elemental Workshop III'
  | 'Elemental Workshop IV'
  | "Enakhra's Lament"
  | 'Enlightened Journey'
  | "Evil Dave's Big Day Out"
  | 'Eye for an Eye (miniquest)'
  | 'Family Crest'
  | 'Fate of the Gods'
  | 'Father and Son'
  | 'Final Destination (miniquest)'
  | 'Flag Fall (miniquest)'
  | 'Forgettable Tale of a Drunken Dwarf'
  | 'Forgiveness of a Chaos Dwarf'
  | "Fur 'n Seek"
  | 'Garden of Tranquillity'
  | "Gertrude's Cat"
  | 'Ghosts Ahoy'
  | 'Ghosts from the Past (miniquest)'
  | 'Glorious Memories'
  | 'Gower Quest'
  | 'Grim Tales'
  | 'Harbinger (miniquest)'
  | 'Haunted Mine'
  | 'Hazeel Cult'
  | 'Head of the Family (miniquest)'
  | 'Heart of Stone'
  | 'Helping Laniakea'
  | "Hero's Welcome"
  | "Heroes' Quest"
  | 'Holy Grail'
  | "Hopespear's Will (miniquest)"
  | 'Horror from the Deep'
  | 'Hunt for Red Raktuber'
  | "Icthlarin's Little Helper"
  | 'Impressing the Locals'
  | 'In Aid of the Myreque'
  | 'In Memory of the Myreque (miniquest)'
  | 'In Pyre Need'
  | 'In Search of the Myreque'
  | 'Jed Hunter (miniquest)'
  | 'Jungle Potion'
  | "Kennith's Concerns"
  | 'Kindred Spirits'
  | 'King of the Dwarves'
  | "King's Ransom"
  | "Koschei's Troubles (miniquest)"
  | 'Lair of Tarn Razorlor (miniquest)'
  | 'Land of the Goblins'
  | 'Legacy of Seergaze'
  | "Legends' Quest"
  | 'Let Them Eat Pie'
  | 'Lost City'
  | 'Love Story'
  | 'Lunar Diplomacy'
  | 'Mahjarrat Memories (miniquest)'
  | 'Making History'
  | 'Meeting History'
  | "Merlin's Crystal"
  | 'Missing My Mummy'
  | 'Missing | Presumed Death'
  | "Monk's Friend"
  | 'Monkey Madness'
  | 'Mountain Daughter'
  | "Mourning's End Part I"
  | "Mourning's End Part II"
  | 'Murder Mystery'
  | "My Arm's Big Adventure"
  | 'Myths of the White Lands'
  | 'Nadir (saga)'
  | 'Nature Spirit'
  | "Nomad's Elegy"
  | "Nomad's Requiem"
  | 'Observatory Quest'
  | "Olaf's Quest"
  | 'Once Upon a Slime'
  | 'One Foot in the Grave (miniquest)'
  | 'One of a Kind'
  | 'One Piercing Note'
  | 'One Small Favour'
  | 'Our Man in the North'
  | 'Perils of Ice Mountain'
  | 'Pieces of Hate'
  | "Pirate's Treasure"
  | 'Plague City'
  | "Plague's End"
  | 'Priest in Peril'
  | 'Purple Cat (miniquest)'
  | 'Quiet Before the Swarm'
  | 'Rag and Bone Man'
  | 'Rat Catchers'
  | 'Rebuilding Edgeville (miniquest)'
  | 'Recipe for Disaster'
  | "Recipe for Disaster: Another Cook's Quest"
  | 'Recipe for Disaster: Defeating the Culinaromancer'
  | 'Recipe for Disaster: Freeing Evil Dave'
  | 'Recipe for Disaster: Freeing King Awowogei'
  | 'Recipe for Disaster: Freeing Pirate Pete'
  | 'Recipe for Disaster: Freeing Sir Amik Varze'
  | 'Recipe for Disaster: Freeing Skrach Uglogwee'
  | 'Recipe for Disaster: Freeing the Goblin Generals'
  | 'Recipe for Disaster: Freeing the Lumbridge Sage'
  | 'Recipe for Disaster: Freeing the Mountain Dwarf'
  | 'Recruitment Drive'
  | 'Regicide'
  | 'Ritual of the Mahjarrat'
  | 'River of Blood'
  | 'Rocking Out'
  | 'Roving Elves'
  | 'Royal Trouble'
  | 'Rum Deal'
  | 'Rune Mechanics'
  | 'Rune Memories'
  | 'Rune Mysteries'
  | 'Salt in the Wound'
  | 'Scorpion Catcher'
  | 'Sea Slug'
  | "Shades of Mort'ton"
  | 'Shadow of the Storm'
  | 'Sheep Herder'
  | 'Sheep Shearer (miniquest)'
  | 'Shield of Arrav'
  | 'Shilo Village'
  | "Sliske's Endgame"
  | 'Smoking Kills'
  | 'Some Like It Cold'
  | 'Song from the Depths'
  | 'Spirit of Summer'
  | 'Spirits of the Elid'
  | 'Spiritual Enlightenment (miniquest)'
  | 'Stolen Hearts'
  | "Summer's End"
  | 'Swan Song'
  | 'Swept Away'
  | 'Tai Bwo Wannai Trio'
  | 'Tales of Nomad (miniquest)'
  | 'Tales of the God Wars (miniquest)'
  | 'Tears of Guthix'
  | 'Tears of Guthix (quest)'
  | 'Temple of Ikov'
  | 'The Branches of Darkmeyer'
  | 'The Brink of Extinction'
  | 'The Chosen Commander'
  | 'The Curse of Arrav'
  | 'The Curse of Zaros (miniquest)'
  | 'The Darkness of Hallowvale'
  | 'The Death of Chivalry'
  | 'The Dig Site'
  | 'The Elder Kiln'
  | 'The Eyes of Glouphrie'
  | 'The Feud'
  | "The Firemaker's Curse"
  | 'The Fremennik Isles'
  | 'The Fremennik Trials'
  | "The General's Shadow (miniquest)"
  | 'The Giant Dwarf'
  | 'The Golem'
  | 'The Grand Tree'
  | 'The Great Brain Robbery'
  | 'The Hand in the Sand'
  | 'The Hunt for Surok (miniquest)'
  | 'The Jack of Spades'
  | "The Knight's Sword"
  | 'The Light Within'
  | 'The Lord of Vampyrium'
  | 'The Lost Toys (miniquest)'
  | 'The Lost Tribe'
  | 'The Mighty Fall'
  | 'The Needle Skips'
  | 'The Path of Glouphrie'
  | 'The Prisoner of Glouphrie'
  | 'The Restless Ghost'
  | 'The Slug Menace'
  | 'The Tale of the Muspah'
  | 'The Temple at Senntisten'
  | 'The Tourist Trap'
  | 'The Void Stares Back'
  | 'The World Wakes'
  | "Thok It To 'Em (saga)"
  | 'Thok Your Block Off (saga)'
  | "Three's Company (saga)"
  | 'Throne of Miscellania'
  | 'TokTz-Ket-Dill'
  | 'Tower of Life'
  | 'Tree Gnome Village'
  | 'Tribal Totem'
  | 'Troll Romance'
  | 'Troll Stronghold'
  | "Tuai Leit's Own (miniquest)"
  | 'Underground Pass'
  | 'Vampyre Slayer'
  | 'Vengeance (saga)'
  | 'Violet is Blue'
  | "Wandering Ga'al (miniquest)"
  | 'Wanted!'
  | 'Watchtower'
  | 'Waterfall Quest'
  | 'What Lies Below'
  | "What's Mine is Yours"
  | 'While Guthix Sleeps'
  | "Witch's House"
  | "Witch's Potion (miniquest)"
  | 'Within the Light'
  | 'Wolf Whistle'
  | 'You Are It'
  | 'Zogre Flesh Eaters';
