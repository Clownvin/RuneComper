# TODOs

## Bugs

- [ ] Some quests are being added as achievements when finding all achievements??? (is this still valid)
- [ ] Skills are showing up with no reqs below trimmed comp???

## Tasks

- [x] Add MQC requirements
- [/] Add "True trim" requirements (WIP)
- [ ] Handle "OR" requirements properly during requirement building (ex. As a First Resort and the Warriors Guild requirements)
  - [ ] Partially complete, added AndOrMap, need to verify correctly utilizing
- [ ] Add ability to determine unknown requirement types via wiki lookup

## Ideas

- [ ] Create WikiPage abstraction over "$", to provide common methods like "releaseDate" etc
- [ ] Track count of "tied" requirements, as those likely can guide us towards better sorts
- [x] Include release time as a tie-breaker in the sort
- [ ] Add items/areas/reputation/etc as requirements

## Optimization

- [ ] Dependency count function is slow/inefficient
