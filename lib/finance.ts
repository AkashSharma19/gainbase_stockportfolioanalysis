/**
 * XIRR (Extended Internal Rate of Return) calculation using Newton-Raphson method.
 */

interface CashFlow {
  amount: number;
  date: Date;
}

export function calculateXIRR(cashFlows: CashFlow[]): number {
  if (!cashFlows || cashFlows.length < 2) return 0;

  // Filter out zero amount flows and validate dates
  const validFlows = cashFlows
    .filter(
      (cf) =>
        typeof cf.amount === 'number' &&
        !isNaN(cf.amount) &&
        Math.abs(cf.amount) > 1e-6 &&
        cf.date instanceof Date &&
        !isNaN(cf.date.getTime()),
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (validFlows.length < 2) return 0;

  const firstDate = validFlows[0].date.getTime();
  const lastDate = validFlows[validFlows.length - 1].date.getTime();
  const totalDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24);

  // Check if there is at least one negative and at least one positive cash flow
  let hasPositive = false;
  let hasNegative = false;
  let totalInvested = 0;
  let totalReturned = 0;

  for (const cf of validFlows) {
    if (cf.amount > 0) {
      hasPositive = true;
      totalReturned += cf.amount;
    } else if (cf.amount < 0) {
      hasNegative = true;
      totalInvested += Math.abs(cf.amount);
    }
  }

  // If all outflows or all inflows, return simple return
  if (!hasPositive || !hasNegative) {
    if (totalInvested > 0) {
      return ((totalReturned - totalInvested) / totalInvested) * 100;
    }
    return 0;
  }

  // If all cash flows occurred within less than 2 days, return simple percentage return
  if (totalDays < 2) {
    return totalInvested > 0
      ? ((totalReturned - totalInvested) / totalInvested) * 100
      : 0;
  }

  const times = validFlows.map(
    (cf) =>
      (cf.date.getTime() - firstDate) / (1000 * 60 * 60 * 24 * 365),
  );

  // NPV function: sum(cf_i / (1 + r)^t_i)
  const npv = (rate: number): number => {
    if (rate <= -0.9999) return Infinity;
    let sum = 0;
    for (let i = 0; i < validFlows.length; i++) {
      const t = times[i];
      const factor = Math.pow(1 + rate, t);
      sum += validFlows[i].amount / factor;
    }
    return sum;
  };

  // Derivative dNPV / dr = - sum(t_i * cf_i / (1 + r)^(t_i + 1))
  const dNpv = (rate: number): number => {
    if (rate <= -0.9999) return -Infinity;
    let sum = 0;
    for (let i = 0; i < validFlows.length; i++) {
      const t = times[i];
      const factor = Math.pow(1 + rate, t + 1);
      sum -= (t * validFlows[i].amount) / factor;
    }
    return sum;
  };

  // 1. Try Newton-Raphson from multiple starting guesses
  const guesses = [0.1, 0.0, -0.1, 0.25, 0.5, -0.5, 1.0, -0.8];
  const maxIterations = 60;
  const precision = 1e-6;

  for (const guess of guesses) {
    let rate = guess;
    let converged = false;

    for (let i = 0; i < maxIterations; i++) {
      const fVal = npv(rate);
      const dfVal = dNpv(rate);

      if (isNaN(fVal) || isNaN(dfVal) || Math.abs(dfVal) < 1e-10) break;

      const step = fVal / dfVal;
      const nextRate = rate - step;

      if (nextRate <= -0.9999 || nextRate > 100.0) break; // Keep within realistic bounds (-99.99% to +10,000%)

      if (Math.abs(nextRate - rate) < precision && Math.abs(fVal) < 1.0) {
        rate = nextRate;
        converged = true;
        break;
      }

      rate = nextRate;
    }

    if (
      converged &&
      !isNaN(rate) &&
      isFinite(rate) &&
      rate > -0.9999 &&
      rate < 100.0
    ) {
      return rate * 100;
    }
  }

  // 2. Fallback: Bisection Method between [-0.99, 10.0]
  let low = -0.99;
  let high = 10.0;
  const fLow = npv(low);
  const fHigh = npv(high);

  if (!isNaN(fLow) && !isNaN(fHigh) && fLow * fHigh <= 0) {
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      const fMid = npv(mid);

      if (Math.abs(fMid) < 1e-4 || (high - low) / 2 < precision) {
        return mid * 100;
      }

      if (fLow * fMid < 0) {
        high = mid;
      } else {
        low = mid;
      }
    }
    return ((low + high) / 2) * 100;
  }

  // 3. Fallback: Simple Return / Annualized return
  if (totalInvested > 0) {
    const simpleReturn = (totalReturned - totalInvested) / totalInvested;
    if (totalDays > 30) {
      const annualized =
        Math.pow(1 + Math.max(-0.99, simpleReturn), 365 / totalDays) - 1;
      if (isFinite(annualized) && Math.abs(annualized) < 50) {
        return annualized * 100;
      }
    }
    return simpleReturn * 100;
  }

  return 0;
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
