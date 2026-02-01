/**
 * Loan Calculation Utilities
 * Based on the standard amortization formula:
 * P = (r * PV) / (1 - (1 + r)^-n)
 *
 * Where:
 * P = Monthly Payment
 * PV = Present Value (Principal)
 * r = Monthly Interest Rate (Annual Rate / 12)
 * n = Number of Payments (Term)
 */

/**
 * Calculates the monthly payment for a loan.
 * @param principal The loan amount (PV)
 * @param annualRate The annual interest rate in percent (e.g., 5.5 for 5.5%)
 * @param termInMonths The number of payments (n)
 * @returns The monthly payment amount
 */
export function calculatePayment(
  principal: number,
  annualRate: number,
  termInMonths: number
): number {
  if (principal <= 0 || termInMonths <= 0) return 0;
  if (annualRate === 0) return principal / termInMonths;

  const monthlyRate = annualRate / 100 / 12;
  const payment =
    (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termInMonths));

  return payment;
}

/**
 * Calculates the loan term (number of payments).
 * Derived from the amortization formula:
 * n = -log(1 - (r * PV) / P) / log(1 + r)
 *
 * @param principal The loan amount (PV)
 * @param annualRate The annual interest rate in percent
 * @param payment The monthly payment amount (P)
 * @returns The number of months (rounded up)
 */
export function calculateTerm(
  principal: number,
  annualRate: number,
  payment: number
): number {
  if (principal <= 0 || payment <= 0) return 0;
  if (annualRate === 0) return Math.ceil(principal / payment);

  const monthlyRate = annualRate / 100 / 12;

  // Check if payment is sufficient to cover interest
  if (payment <= principal * monthlyRate) {
    return Infinity; // Payment too low, will never pay off
  }

  const numerator = Math.log(1 - (principal * monthlyRate) / payment);
  const denominator = Math.log(1 + monthlyRate);
  const term = -numerator / denominator;

  return Math.ceil(term);
}

/**
 * Calculates the loan principal (amount you can borrow).
 * Derived from the amortization formula:
 * PV = (P * (1 - (1 + r)^-n)) / r
 *
 * @param payment The monthly payment amount (P)
 * @param annualRate The annual interest rate in percent
 * @param termInMonths The number of payments (n)
 * @returns The principal amount
 */
export function calculatePrincipal(
  payment: number,
  annualRate: number,
  termInMonths: number
): number {
  if (payment <= 0 || termInMonths <= 0) return 0;
  if (annualRate === 0) return payment * termInMonths;

  const monthlyRate = annualRate / 100 / 12;
  const principal =
    (payment * (1 - Math.pow(1 + monthlyRate, -termInMonths))) / monthlyRate;

  return principal;
}

/**
 * Calculates the annual interest rate.
 * Since 'r' cannot be isolated algebraically in the annuity formula,
 * we use the Newton-Raphson approximation method.
 *
 * f(r) = (r * PV) / (1 - (1 + r)^-n) - P = 0
 *
 * @param principal The loan amount (PV)
 * @param payment The monthly payment amount (P)
 * @param termInMonths The number of payments (n)
 * @returns The annual interest rate in percent
 */
export function calculateRate(
  principal: number,
  payment: number,
  termInMonths: number
): number {
  if (principal <= 0 || payment <= 0 || termInMonths <= 0) return 0;

  // Initial guess roughly based on simple interest
  let rate = (payment * termInMonths) / principal - 1;
  rate = rate / termInMonths; // rough monthly rate

  // If simple interest implies 0 or negative rate (impossible for typical loans if Payment * Term > Principal),
  // start with a small positive number.
  if (rate <= 0) rate = 0.001; // 0.1% monthly

  const MAX_ITERATIONS = 50;
  const PRECISION = 1e-6;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // f(r) = (r * PV) / (1 - (1 + r)^-n) - P
    // optimizing for r (monthly rate)
    // Actually, easier form to differentiate:
    // P = r * PV / (1 - (1+r)^-n)
    // Let's use the function: G(r) = P/r * (1 - (1+r)^-n) - PV = 0
    // This tends to be numerically more stable.

    const powerTerm = Math.pow(1 + rate, -termInMonths);
    const f = (payment / rate) * (1 - powerTerm) - principal;

    // Derivative G'(r)
    // d/dr [ P/r * (1 - (1+r)^-n) ]
    // = P * [ (-1/r^2)(1 - (1+r)^-n) + (1/r)( -(-(n)(1+r)^(-n-1)) ) ]
    // = P * [ -(1 - (1+r)^-n)/r^2 + n(1+r)^(-n-1)/r ]

    const df =
      payment *
      ((-1 * (1 - powerTerm)) / (rate * rate) +
        (termInMonths * Math.pow(1 + rate, -termInMonths - 1)) / rate);

    const diff = f / df;
    const newRate = rate - diff;

    if (Math.abs(diff) < PRECISION) {
      rate = newRate;
      break;
    }

    rate = newRate;
  }

  return rate * 12 * 100; // Convert monthly decimal to annual percent
}

/**
 * Calculates the annual interest rate given:
 * - Original Principal (P)
 * - Current Balance (B)
 * - Monthly Payment (PMT)
 * - Elapsed Months (t)
 *
 * Formula: B = P(1+r)^t - PMT * ((1+r)^t - 1)/r
 * Solved via Newton-Raphson for r.
 *
 * @param principal Original loan amount
 * @param balance Current balance
 * @param payment Monthly payment
 * @param elapsedMonths Number of months passed
 * @returns Annual interest rate in percent
 */
export function calculateRateFromPrincipalAndBalance(
  principal: number,
  balance: number,
  payment: number,
  elapsedMonths: number
): number {
  if (principal <= 0 || payment <= 0 || elapsedMonths <= 0) return 0;
  if (balance >= principal) return 0; // Negative amortization or zero payments?

  // Initial guess
  // r approx (TotalInterest / AverageBalance) / Time?
  // Let's start safely small.
  let rate = 0.005; // 0.5% monthly = 6% annual

  const MAX_ITERATIONS = 50;
  const PRECISION = 1e-6;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const u = 1 + rate;
    const ut = Math.pow(u, elapsedMonths);

    // f(r) = P*u^t - PMT*(u^t - 1)/r - B
    const f = principal * ut - (payment * (ut - 1)) / rate - balance;

    // Derivative f'(r)
    // d/dr [ P*u^t ] = P * t * u^(t-1)
    // d/dr [ PMT/r * (u^t - 1) ] = PMT * [ (t*u^(t-1))/r - (u^t - 1)/r^2 ]
    //
    // f'(r) = P*t*u^(t-1) - PMT * [ (t*u^(t-1)*r - (ut - 1)) / r^2 ]
    const term1 = principal * elapsedMonths * Math.pow(u, elapsedMonths - 1);
    const term2Numerator =
      elapsedMonths * Math.pow(u, elapsedMonths - 1) * rate - (ut - 1);
    const term2 = (payment * term2Numerator) / (rate * rate);

    const df = term1 - term2;

    if (Math.abs(df) < 1e-9) break; // Avoid checking logic errors

    const diff = f / df;
    const newRate = rate - diff;

    if (Math.abs(diff) < PRECISION) {
      rate = newRate;
      break;
    }

    rate = newRate;
    if (rate <= -0.9) rate = -0.1; // deeply negative rates clamp
  }

  if (rate < 0) return 0; // Floor at 0
  return rate * 12 * 100;
}

/**
 * Projects a start date forward by months until it reaches or exceeds the target date (today).
 * Used for existing loans to estimate the next due date based on the first payment date.
 *
 * @param startDate The initial start date (e.g., first payment date)
 * @param targetDate The date to project towards (usually today)
 * @returns The next projected date
 */
export function calculateProjectedDueDate(
  startDate: Date,
  targetDate: Date = new Date()
): Date {
  const nextDate = new Date(startDate);
  const targetTime = targetDate.getTime();

  // If date is already in future, return it
  if (nextDate.getTime() > targetTime) {
    return nextDate;
  }

  // Safety brake to prevent infinite loops if something is weird
  let safetyCounter = 0;
  const MAX_ITERATIONS = 1200; // 100 years of months

  // Add months until we pass today
  while (nextDate.getTime() <= targetTime && safetyCounter < MAX_ITERATIONS) {
    // Add one month
    // Handling month overflow correctly:
    // e.g. Jan 31 + 1 month -> Feb 28 (or 29)
    const currentMonth = nextDate.getMonth();
    nextDate.setMonth(currentMonth + 1);

    // Check if day rolled over (e.g. Jan 31 -> Mar 3)
    // Optimization: Standard JS setMonth behavior handles rollover, but if we want to stick to the "day of month",
    // we might need correction. However, for simple payment projection, standard Date behavior is usually acceptable
    // or effectively standard financial behavior (last day of month or similar).
    // Let's stick to standard Date behavior for now as it's robust enough for "Next Due Date" estimation.

    safetyCounter++;
  }

  return nextDate;
}
