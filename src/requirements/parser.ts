// async function getQuestWithRequirements(
//   quest: IQuest,
//   questNames: Set<string>
// ): Promise<QuestRequirement> {
//   const requirement = new QuestRequirement(quest);

//   const $ = await loadWikiPage(quest.page);
//   $('table.questdetails tbody')
//     .find('tr')
//     .each((_, e) => {
//       const row = $(e);
//       const header = row.find('th.questdetails-header').text();
//       if (header !== 'Requirements' && header !== 'Recommended') {
//         return;
//       }
//       const required = header === 'Requirements';
//       const rows = row
//        or .find('ul li')
//         .toArray()
//         .map(e => {
//           const ele = $(e);
//           const text = ele.text();
//           if (text === null) {
//             return text;
//           }
//           return [text.toLowerCase(), ele] as const;
//         })
//         .filter(isNonNullish);

//       let or: {or: AndOrMap<IRequirements>} | undefined;
//       rows.forEach(([text, ele]) => {
//         const req = (() => {
//           if (/^\d+\s+\w/.test(text) && !text.includes('quest point')) {
//             if (
//               /\d+\s+combat(\s+or\s+more)?(\s+is)?(\s+strongly)?(\s+recommended)?\.?$/.test(
//                 text
//               )
//             ) {
//               const [combat] = text.split(/\s+/g);
//               console.log('Matches that combat text things');
//               console.log(text);
//               return new CombatRequirement(Number.parseFloat(combat));
//             }
//             // if (quest.name === 'As a First Resort') {
//             //   console.log(text);
//             // }
//             if (
//               /\s((or)|(and))\s/g.test(text)
//               // !/((\d+)|(one)|(two)) or \d+/g.test(text)
//             ) {
//               if (text.includes("warriors' guild access")) {
//                 return {
//                   or: new AndOrMap<IRequirements>(
//                     {
//                       name: Skill.ATTACK,
//                       type: 'skill',
//                       page: getSkillPage(Skill.ATTACK),
//                       level: 99,
//                       boostable: false,
//                     },
//                     {
//                       name: Skill.STRENGTH,
//                       type: 'skill',
//                       page: getSkillPage(Skill.ATTACK),
//                       level: 99,
//                       boostable: false,
//                     },
//                     {
//                       and: new AndOrMap<IRequirements>(
//                         {
//                           name: Skill.ATTACK,
//                           type: 'skill',
//                           page: getSkillPage(Skill.ATTACK),
//                           level: 65,
//                           boostable: false,
//                         },
//                         {
//                           name: Skill.STRENGTH,
//                           type: 'skill',
//                           page: getSkillPage(Skill.STRENGTH),
//                           level: 65,
//                           boostable: false,
//                         }
//                       ),
//                     }
//                   ),
//                 };
//               }
//               if (/\d+\s+\w+\s+((and)|(or))\s+\d+\s+\w+/.test(text)) {
//                 const [lvlA, skillA, diff, levelB, skillB] = text
//                   .trim()
//                   .replace(/\s+/g, ' ')
//                   .split(' ');
//                 console.log(lvlA, skillA, diff, levelB, skillB);
//               }
//               console.log(quest.page, 'HAS AND/OR');
//               console.log(text);
//               console.log();
//             }
//             const [level, skill] = text.split(/\s+\[?/);
//             if (!isSkill(skill)) {
//               return undefined;
//             }
//             return {
//               type: 'skill' as const,
//               name: skill,
//               page: getSkillPage(skill),
//               level: parseInt(level) || 0,
//               boostable: text.includes('[b]'),
//             };
//           } else {
//             return ele
//               .find('>a')
//               .toArray()
//               .map(a => {
//                 const text = $(a).text();
//                 const page = $(a).attr('href');
//                 if (!page || !questNames.has(text)) {
//                   return undefined;
//                 }
//                 if (
//                   text === quest.name ||
//                   requirement.find(quest => quest.name === text)
//                 ) {
//                   return undefined;
//                 }
//                 // if () {}
//                 return {
//                   name: text,
//                   page,
//                   type: 'quest' as const,
//                   miniquest: false,
//                   required,
//                 };
//               })
//               .filter(isNonNullish);
//           }
//         })();

//         if (!req) {
//           return undefined;
//         }

//         if (text.trim().endsWith('or')) {
//           console.log('OR');
//           if (!or) {
//             or = {or: new AndOrMap()};
//           }
//           or.or.add(...(Array.isArray(req) ? req : [req]));
//         } else if (or) {
//           or.or.add(...(Array.isArray(req) ? req : [req]));
//           console.log('Adding or', JSON.stringify(or, null, 2));
//           requirement.add(or);
//           or = undefined;
//         } else {
//           requirement.add(...(Array.isArray(req) ? req : [req]));
//         }

//         return undefined;
//       });
//     });
//   return requirement;
// }
