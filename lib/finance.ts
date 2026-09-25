/**
 * XIRR (Extended Internal Rate of Return) calculation using Newton-Raphson method.
 */

interface CashFlow {
  amount: number;
  date: Date;
}

export function calculateXIRR(cashFlows: CashFlow[]): number {
  // ... logic remains same
  if (cashFlows.length < 2) return 0;
  const maxIterations = 100;
  const precision = 1e-6;
  let rate = 0.1;
  for (let i = 0; i < maxIterations; i++) {
    let f = 0;
    let df = 0;
    for (const cf of cashFlows) {
      const days =
        (cf.date.getTime() - cashFlows[0].date.getTime()) /
        (1000 * 60 * 60 * 24);
      const fraction = days / 365;
      const term = Math.pow(1 + rate, fraction);
      f += cf.amount / term;
      df -= (cf.amount * fraction) / (term * (1 + rate));
    }
    const nextRate = rate - f / df;
    if (Math.abs(nextRate - rate) < precision) return nextRate * 100;
    rate = nextRate;
  }
  return rate * 100;
}

export function calculateProjection(
  currentVal: number,
  annualReturn: number,
  monthlySIP: number,
  years: number,
  stepUpPercent: number = 0,
  inflationRate: number = 0.06,
  isInflationAdjusted: boolean = false,
) {
  let totalFutureValue = currentVal;
  let totalInvested = currentVal;
  let currentMonthlySIP = monthlySIP;

  const inflationFactor = isInflationAdjusted ? 1 + inflationRate : 1;

  for (let year = 1; year <= years; year++) {
    // Apply returns and SIP for 12 months
    for (let month = 1; month <= 12; month++) {
      totalFutureValue = totalFutureValue * Math.pow(1 + annualReturn, 1 / 12) + currentMonthlySIP;
      totalInvested += currentMonthlySIP;
    }
    // Apply step-up at the end of each year
    currentMonthlySIP = currentMonthlySIP * (1 + stepUpPercent / 100);
  }

  const estimatedGains = totalFutureValue - totalInvested;
  const multiplier = totalFutureValue / totalInvested;
  
  // If not already adjusted in the loop, we can do it at the end for simple "current value today"
  const presentValue = totalFutureValue / Math.pow(1 + inflationRate, years);

  // If inflation adjusted mode is ON, we return the discounted future value as the primary value
  const displayValue = isInflationAdjusted ? presentValue : totalFutureValue;

  return {
    totalFutureValue: displayValue,
    totalInvested,
    estimatedGains: isInflationAdjusted ? presentValue - totalInvested : estimatedGains,
    multiplier: isInflationAdjusted ? presentValue / totalInvested : multiplier,
    presentValue,
  };
}

export function calculateProjectionSeries(
  currentVal: number,
  annualReturn: number,
  monthlySIP: number,
  years: number,
  stepUpPercent: number = 0,
  inflationRate: number = 0.06,
  isInflationAdjusted: boolean = false,
) {
  const dataPoints = [];
  let totalFutureValue = currentVal;
  let currentMonthlySIP = monthlySIP;
  let totalInvested = currentVal;

  dataPoints.push({
    year: 0,
    value: currentVal,
    label: 'Now',
    totalInvested: currentVal,
    estimatedGains: 0,
    multiplier: 1,
  });

  for (let year = 1; year <= years; year++) {
    for (let month = 1; month <= 12; month++) {
      totalFutureValue = totalFutureValue * Math.pow(1 + annualReturn, 1 / 12) + currentMonthlySIP;
      totalInvested += currentMonthlySIP;
    }
    
    // Apply step-up for NEXT year
    currentMonthlySIP = currentMonthlySIP * (1 + stepUpPercent / 100);

    const valToPush = isInflationAdjusted 
      ? totalFutureValue / Math.pow(1 + inflationRate, year)
      : totalFutureValue;

    dataPoints.push({
      year,
      value: valToPush,
      label: `+${year}y`,
      totalInvested,
      estimatedGains: valToPush - totalInvested,
      multiplier: valToPush / totalInvested,
    });
  }
  return dataPoints;
}

export function formatIndianNumber(num: number | string | undefined | null): string {
  if (num === null || num === undefined) return 'N/A';
  const val = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  if (isNaN(val)) return String(num);

  if (val >= 10000000) {
    return (val / 10000000).toFixed(2) + ' Cr';
  } else if (val >= 100000) {
    return (val / 100000).toFixed(2) + ' L';
  } else if (val >= 1000) {
    return (val / 1000).toFixed(2) + ' K';
  }
  return val.toFixed(2);
}

export function advanceDateByCycle(dateStr: string, cycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): string {
  const d = new Date(dateStr);
  if (cycle === 'weekly') d.setDate(d.getDate() + 7);
  else if (cycle === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (cycle === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

/**
 * Calculates the next due payment date for a loan based on cumulative payments and monthly advance credits.
 * Handles multiple payments in the same month and rolling advance installments.
 */
export function getNextLoanDuePayment(
  loan: {
    id: string;
    startDate: string;
    endDate: string;
    emiAmount: number;
    outstandingAmount: number;
    interestRate: number;
    isActive: boolean;
  },
  emiPayments: Array<{
    loanId: string;
    date: string;
    amount: number;
    principalPortion?: number;
    interestPortion?: number;
    status?: 'paid' | 'upcoming' | 'overdue';
  }>,
  today: Date = new Date()
): Date | null {
  if (!loan.isActive || loan.emiAmount <= 0 || loan.outstandingAmount <= 0) {
    return null;
  }

  const start = new Date(loan.startDate);
  const targetDay = start.getDate();
  const endLimit = new Date(loan.endDate);

  const getSafeDueDate = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(targetDay, daysInMonth));
  };

  // Filter regular paid payments for this loan
  const loanPayments = emiPayments.filter((p) => {
    if (p.loanId !== loan.id) return false;
    if (p.status && p.status !== 'paid') return false;
    // Exclude explicit pure prepayments where interest is 0 and amount differs from standard EMI
    const isPrepayment =
      loan.interestRate > 0 &&
      p.interestPortion === 0 &&
      Math.abs(p.amount - loan.emiAmount) > 1;
    return !isPrepayment;
  });

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  let startTrackYear = start.getFullYear();
  let startTrackMonth = start.getMonth();

  // If start date is far in the past and user only logged recent payments
  const earliestPayment = loanPayments.reduce<Date | null>((earliest, p) => {
    const d = new Date(p.date);
    return !earliest || d < earliest ? d : earliest;
  }, null);

  if (earliestPayment) {
    const pYear = earliestPayment.getFullYear();
    const pMonth = earliestPayment.getMonth();
    const pTotalMonths = pYear * 12 + pMonth;
    const startTotalMonths = startTrackYear * 12 + startTrackMonth;
    if (pTotalMonths > startTotalMonths) {
      startTrackYear = pYear;
      startTrackMonth = pMonth;
    }
  } else {
    const startTotalMonths = startTrackYear * 12 + startTrackMonth;
    const currentTotalMonths = currentYear * 12 + currentMonth;
    if (startTotalMonths < currentTotalMonths) {
      startTrackYear = currentYear;
      startTrackMonth = currentMonth;
    }
  }

  // Iterate month by month from startTrack up to currentMonth
  let credits = 0;
  let iterYear = startTrackYear;
  let iterMonth = startTrackMonth;

  while (iterYear < currentYear || (iterYear === currentYear && iterMonth <= currentMonth)) {
    const paymentsInMonth = loanPayments.filter((p) => {
      const pDate = new Date(p.date);
      return pDate.getFullYear() === iterYear && pDate.getMonth() === iterMonth;
    }).length;

    credits += paymentsInMonth;

    if (iterYear < currentYear || iterMonth < currentMonth) {
      if (credits > 0) {
        credits -= 1;
      }
    }

    iterMonth++;
    if (iterMonth > 11) {
      iterMonth = 0;
      iterYear++;
    }
  }

  // Determine next due date based on accumulated credits
  let nextDue: Date;
  if (credits === 0) {
    nextDue = getSafeDueDate(currentYear, currentMonth);
  } else {
    nextDue = getSafeDueDate(currentYear, currentMonth + credits);
  }

  if (nextDue < start) {
    nextDue = new Date(start);
  }

  if (nextDue > endLimit) {
    return null;
  }

  return nextDue;
}
