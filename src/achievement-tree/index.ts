import axios from 'axios';
import * as cheerio from 'cheerio';
import {URLBuilder} from '../util/url';

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
  {name: 'Lumbridge Set Tasks - Easy', page: '/w/Lumbridge_Set_Tasks_-_Easy'},
  {
    name: 'Lumbridge Set Tasks - Medium',
    page: '/w/Lumbridge_Set_Tasks_-_Medium',
  },
  {name: 'Lumbridge Set Tasks - Hard', page: '/w/Lumbridge_Set_Tasks_-_Hard'},
  {name: 'Lumbridge Set Tasks - Elite', page: '/w/Lumbridge_Set_Tasks_-_Elite'},
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
    name: 'Varrock Set Tasks - Beginner',
    page: '/w/Varrock_Set_Tasks_-_Beginner',
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

export async function getCompletionistCapeAchievementsWithRequirements() {
  const achievements = await getCompletionistCapeAchievements();
  achievements.push(...taskMasterAchievements);
  return await Promise.all(
    achievements.map(async achievement => {
      return await getAchievementWithRequirements(achievement);
    })
  );
}

async function getAchievementWithRequirements(achievement: {
  name: string;
  page: string;
}) {
  switch (achievement.name) {
    //Ignored because we added it's composite achievements
    case 'Task Master':
      return {
        ...achievement,
        requirements: {
          achievements: taskMasterAchievements.map(a => a.name),
        },
      };
    case 'Stacks on Stacks':
      return {
        ...achievement,
        requirements: {
          skills: [
            {
              agility: 30,
              slayer: 55,
              hunter: 75,
            },
            {
              woodcutting: 81,
            },
            {
              slayer: 55,
              hunter: 75,
            },
            {
              hunter: 75,
              slayer: 90,
            },
            {
              agility: 30,
              hunter: 75,
              slayer: 90,
            },
            {
              agility: 30,
              slayer: 90,
            },
          ],
        },
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
        requirements: null,
      };
    default:
      return getAchievementWithNormalRequirements(achievement);
  }
}

async function getAchievementWithNormalRequirements(achievement: {
  name: string;
  page: string;
}) {
  const url = rsWikiUrl.build(achievement.page);
  const result = await axios.get(url);
  const $ = cheerio.load(result.data);
  const requirements = $('#infobox-achievement td.qc-active');
  console.log(achievement.name);
  console.log(requirements.html());
  if ((requirements.html() as string).includes('See article')) {
    console.log(
      'Achievement has additional info',
      achievement.name,
      achievement.page
    );
  }
}

async function getCompletionistCapeAchievements() {
  const url = rsWikiUrl.build('/w/Completionist_cape');
  const result = await axios.get(url);
  const $ = cheerio.load(result.data);
  const achievementRows = $(
    'html body div#bodyContent.mw-body-content table[width="100%"] tbody'
  );
  const achievements: {name: string; page: string}[] = [];
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
  return achievements;
}
