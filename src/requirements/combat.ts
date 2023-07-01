import {
  ICombatLevel,
  Requirement,
  RequirementID,
  getRequirementID,
} from './requirement';

export class CombatRequirement
  extends Requirement<'combat'>
  implements ICombatLevel
{
  readonly name = 'Combat';
  readonly type = 'combat';
  readonly page = '/w/Combat_level';
  readonly id: RequirementID;

  constructor(image: string, readonly level: number) {
    super({
      name: 'Combat',
      page: '/w/Combat_level',
      icon: image,
      type: 'combat',
    });
    this.id = getRequirementID(this);
  }
}
