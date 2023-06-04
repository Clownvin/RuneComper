export type Type = 'quest' | 'skill' | 'achievement';

export interface Requirement {
  type: Type;
  name: string;
  page: string;
  achievements: {name: string; page: string; type: 'achievement'}[];
  quests: {name: string; page: string; required: boolean; type: 'quest'}[];
  skills: {name: string; page?: string; level: number; type: 'skill'}[];
}
