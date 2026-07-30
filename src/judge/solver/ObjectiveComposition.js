/**
 * ObjectiveComposition.js - Version 1
 * Lexicographical Hierarchical Objective Composition with Declarative Conditional Goals.
 */

export class ObjectiveComposition {
  static VERSION = 1;
  static COMPATIBLE_UNTIL = 2;

  constructor({ userGoal = 'StandardWin', primary = [], secondary = [], tertiary = [], conditionalGoals = [] }) {
    this.version = ObjectiveComposition.VERSION;
    this.compatibleUntil = ObjectiveComposition.COMPATIBLE_UNTIL;
    this.userGoal = userGoal;
    this.primary = Object.freeze([...primary]);
    this.secondary = Object.freeze([...secondary]);
    this.tertiary = Object.freeze([...tertiary]);
    this.conditionalGoals = Object.freeze([...conditionalGoals]);

    Object.freeze(this);
  }

  static createFromGoal(userGoal) {
    if (userGoal === 'FastWin' || userGoal === 'AggroSpeed') {
      return new ObjectiveComposition({
        userGoal,
        primary: ['ExpectedTurnToWin', 'ManaEfficiency'],
        secondary: ['BoardPressure', 'Consistency'],
        tertiary: ['Resilience']
      });
    }

    return new ObjectiveComposition({
      userGoal,
      primary: ['StrategyCoverage', 'Consistency'],
      secondary: ['Resilience', 'ResourceEfficiency'],
      tertiary: ['DeadCardMinimization']
    });
  }
}
