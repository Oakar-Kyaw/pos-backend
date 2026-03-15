export interface EarlyLeaveDeductionItem {
  date: Date;
  earlyLeaveMinutes: number;
  ruleId: number;
  threshold: number;
  deduction: number;
}

export interface lateDeductionItem {
  date: Date;
  lateMinutes: number;
  ruleId: number;
  threshold: number;
  deduction: number;
}
