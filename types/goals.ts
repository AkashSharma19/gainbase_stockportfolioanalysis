export type GoalCategory = 'savings' | 'investments' | 'debt' | 'retirement' | 'custom';
export type GoalUnit = 'currency' | 'percentage' | 'number';
export type GoalOperator = '>=' | '<=' | '==';

export interface FinancialGoal {
  id: string;
  name: string;
  description?: string;
  category: GoalCategory;
  icon: string;
  color: string;
  formula: string; // e.g. "Cash + Savings + Emergency" or "Total Holdings Value" or "Portfolio XIRR"
  targetValue: number; // Final target value e.g. 1000000
  targets?: number[]; // Array of milestone targets e.g. [100000, 500000, 1000000]
  initialValue?: number; // Starting balance when the goal was created
  unit: GoalUnit;
  operator: GoalOperator;
  targetDate?: string; // ISO string
  isManuallyCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalVariableDefinition {
  key: string;
  label: string;
  description: string;
  category: 'money' | 'investments' | 'combined';
  unit: GoalUnit;
  iconName: string;
}

export interface EvaluatedMilestoneSegment {
  targetValue: number;
  segmentIndex: number;
  totalSegments: number;
  isAchieved: boolean;
  fillPercentage: number; // 0 to 100% for this individual segment part
  rangeStart: number;
  rangeEnd: number;
  spanRatio: number; // Fraction (0 to 1) of the total goal length that this segment represents
}

export interface EvaluatedGoal extends FinancialGoal {
  currentValue: number;
  progressPercentage: number; // Overall progress percentage across all targets
  milestoneSegments: EvaluatedMilestoneSegment[];
  activeMilestoneIndex: number; // Index of the milestone currently in progress
  activeMilestoneTarget: number;
  isConditionMet: boolean;
  isAchieved: boolean; // isConditionMet || isManuallyCompleted
  remainingValue: number;
  daysRemaining?: number;
}
