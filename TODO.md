# TODOs

## Bugs

- [ ] Some quests are being added as achievements when finding all achievements??? (is this still valid?)
- [ ] Skills are showing up with no reqs below trimmed comp??? [Check fixed]
- [ ] "Smoking kills" showing up under achieves. Probably related to case
- [ ] Mogre (miniquest/lore activity) shows up under achievements
  - [ ] Same with RfD: Defeating the Culinaromancer
  - [ ] Same with Dimension of Disaster: Curse of Arrav
  - [ ] Same with Dimension of Disaster: Shield of Arrav
- [ ] Quest Cape (Item) showing up under achievs
- [ ] Same with Clean Necklace/Dung tokens
- [ ] "Forge War" and other Arch Items showing up under achievs
- [ ] "Fairy Rings" is not achievement
- [ ] "Tears of Guthix" is not achievement (move to D&D section? idea below)
- [ ] "Inferno Adze" Item does not have requirements. Can probably get by parsing the "Obtaining" section of its wiki
- [ ] That "nipped in the butt" task or whatver should require dominion tower
- [ ] Varrock Set Tasks- Hard does not match Wiki Requirements.
- [ ] Research - Orthen is missing requirements
- [ ] Champions guild is not an achievement
- [ ] Dungeoneering token is not an achievement
- [ ] RFD subquests don't show up under requirements (look at evil dave's big day out)

## Tasks

- [x] Add MQC requirements
- [/] Add "True trim" requirements (WIP)
- [ ] Handle "OR" requirements properly during requirement building (ex. As a First Resort and the Warriors Guild requirements)
  - [ ] Partially complete, added AndOrMap, need to verify correctly utilizing
- [ ] Add ability to determine unknown requirement types via wiki lookup

## Ideas

- [ ] Area tasks tend to be out of order. Could probably solve somewhat by at least sorting by task group difficulty (easy, med, hard)
- [ ] Include a detail blurb on cards, like task details for achiev tasks
- [ ] Create WikiPage abstraction over "$", to provide common methods like "releaseDate" etc
- [ ] Track count of "tied" requirements, as those likely can guide us towards better sorts
- [x] Include release time as a tie-breaker in the sort
- [ ] Add items/areas/reputation/etc as requirements
- [ ] Add D&Ds like penguins and tears to some category. Currently they show up under achievs (Bug above)
- [ ] Perhaps there's a way to embed more info from the wiki in like a dropdown. Like achievement cards or quest quick guide
- [ ] Pull any non-implied post-"thing" achievements, like after quest stuff, into app
- [ ] Store player achievement data on server? Would require login, probably, but allows for more permanent, cloud based storage, rather than local browser only storage
- [ ] Include boostability to the requirement cards
- [ ] Include toggles for certain optional requirements (like Deaths Swiftness from World Wakes)

## Optimization

- [ ] Dependency count function is slow/inefficient
