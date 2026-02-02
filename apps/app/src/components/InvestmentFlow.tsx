import { useState, useMemo } from 'react';
import type {
  InvestmentIncomeSubtype,
  InvestmentAccountType,
  IncomePredictability,
  PaymentFrequency,
  CreateIncomeInput,
} from '@rates/firebase-client';
import { WizardProgressBar } from './WizardProgressBar';
import { Select } from './Select';
import { CurrencyInput } from './CurrencyInput';

type InvestmentFlowStep =
  | 'name_institution'
  | 'account_type_select'
  | 'investment_type_select'
  | 'entry_method'
  | 'amount_entry'
  | 'yield_rate_entry'
  | 'reinvestment'
  | 'timing'
  | 'review';

type EntryMethod = 'amount' | 'yield_rate' | 'annual_total';

interface InvestmentFlowProps {
  onBack: () => void;
  onComplete: (data: CreateIncomeInput) => void | Promise<void>;
}

const SUBTYPE_OPTIONS: {
  value: InvestmentIncomeSubtype;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: 'dividends',
    label: 'Dividends',
    icon: '📊',
    description: 'Income from stocks, ETFs, or mutual funds.',
  },
  {
    value: 'interest',
    label: 'Interest',
    icon: '🏦',
    description: 'From savings accounts, CDs, or bonds.',
  },
  {
    value: 'capital_gains',
    label: 'Capital Gains',
    icon: '📈',
    description: 'Profits from selling investments.',
  },
  {
    value: 'distributions',
    label: 'Retirement Distributions',
    icon: '🎂',
    description: 'Withdrawals from IRA, 401(k), or pension.',
  },
  {
    value: 'reit',
    label: 'REIT Distributions',
    icon: '🏢',
    description: 'Income from real estate investment trusts.',
  },
  {
    value: 'royalties',
    label: 'Royalties',
    icon: '©️',
    description: 'From patents, licensing, or creative works.',
  },
  {
    value: 'other',
    label: 'Other',
    icon: '❓',
    description: 'Other types of investment income.',
  },
];

const ACCOUNT_TYPE_OPTIONS: { value: InvestmentAccountType; label: string }[] =
  [
    { value: 'taxable', label: 'Taxable Brokerage' },
    { value: 'traditional_ira', label: 'Traditional IRA' },
    { value: 'roth_ira', label: 'Roth IRA' },
    { value: '401k', label: '401(k)' },
    { value: 'savings', label: 'Savings Account' },
    { value: 'cd', label: 'Certificate of Deposit (CD)' },
    { value: 'hsa', label: 'Health Savings Account (HSA)' },
    { value: 'other', label: 'Other / Not Sure' },
  ];

const PREDICTABILITY_OPTIONS: {
  value: IncomePredictability;
  label: string;
  description: string;
}[] = [
  {
    value: 'highly_predictable',
    label: 'Very predictable',
    description: 'Stable, rarely changes.',
  },
  {
    value: 'somewhat_predictable',
    label: 'Somewhat predictable',
    description: 'Usually consistent but may vary.',
  },
  {
    value: 'variable',
    label: 'Variable',
    description: 'Fluctuates frequently.',
  },
  {
    value: 'unpredictable',
    label: 'Unpredictable',
    description: 'Sporadic or one-time.',
  },
];

const FREQUENCY_OPTIONS: { value: PaymentFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annually', label: 'Semi-Annually' },
  { value: 'annually', label: 'Annually' },
];

export function InvestmentFlow({ onBack, onComplete }: InvestmentFlowProps) {
  const [step, setStep] = useState<InvestmentFlowStep>('name_institution');

  // Form State
  const [name, setName] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [accountType, setAccountType] =
    useState<InvestmentAccountType>('taxable');
  const [investmentSubtype, setInvestmentSubtype] =
    useState<InvestmentIncomeSubtype | null>(null);
  const [predictability, setPredictability] = useState<IncomePredictability>(
    'somewhat_predictable'
  );
  const [entryMethod, setEntryMethod] = useState<EntryMethod>('amount');
  const [currency, setCurrency] = useState<'COP' | 'USD'>('USD');

  // Values
  const [incomeAmount, setIncomeAmount] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [annualRate, setAnnualRate] = useState('');
  const [portfolioValue, setPortfolioValue] = useState('');
  const [dividendYield, setDividendYield] = useState('');

  // Cash Flow
  const [isReinvested, setIsReinvested] = useState(false);
  const [cashPercentage, setCashPercentage] = useState('100');

  // Timing
  const [paymentFrequency, setPaymentFrequency] =
    useState<PaymentFrequency>('monthly');
  const [nextPaymentDate, setNextPaymentDate] = useState('');

  const steps = useMemo(() => {
    const s: InvestmentFlowStep[] = [
      'name_institution',
      'account_type_select',
      'investment_type_select',
      'entry_method',
    ];
    if (entryMethod === 'amount' || entryMethod === 'annual_total') {
      s.push('amount_entry');
    } else {
      s.push('yield_rate_entry');
    }
    s.push('reinvestment', 'timing', 'review');
    return s;
  }, [entryMethod]);

  const currentStepIndex = steps.indexOf(step);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    } else {
      onBack();
    }
  };

  const calculateMonthlyEstimate = () => {
    if (entryMethod === 'amount') {
      const amt = parseFloat(incomeAmount) || 0;
      const multiplier =
        paymentFrequency === 'monthly'
          ? 1
          : paymentFrequency === 'quarterly'
            ? 1 / 3
            : paymentFrequency === 'semi_annually'
              ? 1 / 6
              : 1 / 12;
      return amt * multiplier;
    } else if (entryMethod === 'annual_total') {
      return (parseFloat(incomeAmount) || 0) / 12;
    } else if (entryMethod === 'yield_rate') {
      if (investmentSubtype === 'interest') {
        const principal = parseFloat(principalAmount) || 0;
        const rate = parseFloat(annualRate) || 0;
        return (principal * (rate / 100)) / 12;
      } else {
        const portfolio = parseFloat(portfolioValue) || 0;
        const yieldVal = parseFloat(dividendYield) || 0;
        return (portfolio * (yieldVal / 100)) / 12;
      }
    }
    return 0;
  };

  const handleFinish = () => {
    if (!investmentSubtype) return;

    const payload: Record<string, unknown> = {
      type: 'investments',
      name,
      institutionName,
      accountType,
      investmentSubtype,
      predictability,
      currency,
      paymentFrequency,
      isReinvested,
      status: 'active',
    };

    if (entryMethod === 'amount' || entryMethod === 'annual_total') {
      let amt = parseFloat(incomeAmount) || 0;
      if (entryMethod === 'annual_total') {
        // If they enter annual total, we normalize to the frequency
        const divisor =
          paymentFrequency === 'monthly'
            ? 12
            : paymentFrequency === 'quarterly'
              ? 4
              : paymentFrequency === 'semi_annually'
                ? 2
                : 1;
        amt = amt / divisor;
      }
      payload.incomeAmount = { amount: amt, currency };
    } else {
      if (investmentSubtype === 'interest') {
        payload.principalAmount = {
          amount: parseFloat(principalAmount) || 0,
          currency,
        };
        payload.annualRate = parseFloat(annualRate) || 0;
      } else {
        payload.portfolioValue = {
          amount: parseFloat(portfolioValue) || 0,
          currency,
        };
        payload.dividendYield = parseFloat(dividendYield) || 0;
      }
      // Set calculated income amount for summary etc
      payload.incomeAmount = { amount: calculateMonthlyEstimate(), currency };
    }

    if (!isReinvested) {
      payload.cashPercentage = parseFloat(cashPercentage) || 100;
    }

    if (nextPaymentDate) {
      payload.nextPaymentDate = new Date(nextPaymentDate);
    }

    void onComplete(payload as CreateIncomeInput);
  };

  return (
    <div className="flex h-full flex-col text-white">
      <WizardProgressBar
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        label={step.replace(/_/g, ' ')}
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 pr-2">
        {step === 'name_institution' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              📈 Let's add your investment income
            </h2>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                What would you like to call this income?
              </label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g., "Fidelity Dividends", "HYSA Interest"'
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Where is this investment held? (optional)
              </label>
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder='e.g., "Vanguard", "Chase Bank"'
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold uppercase tracking-wide text-white/90">
                Currency
              </label>
              <Select
                id="currency"
                value={currency}
                onChange={(v) => setCurrency(v as 'COP' | 'USD')}
                options={[
                  { value: 'USD', label: 'USD (US Dollar)' },
                  { value: 'COP', label: 'COP (Colombian Peso)' },
                ]}
              />
            </div>
          </div>
        )}

        {step === 'account_type_select' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">What type of account is this?</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAccountType(opt.value)}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                    accountType === opt.value
                      ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                </button>
              ))}
            </div>
            <p className="text-sm text-white/50">
              💡 This helps with tax planning. Skip if you're not sure.
            </p>
          </div>
        )}

        {step === 'investment_type_select' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              💰 What type of income is this?
            </h2>
            <div className="flex flex-col gap-3">
              {SUBTYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setInvestmentSubtype(opt.value);
                    if (opt.value === 'interest') {
                      setPredictability('highly_predictable');
                      setPaymentFrequency('monthly');
                    } else if (opt.value === 'dividends') {
                      setPaymentFrequency('quarterly');
                    }
                  }}
                  className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                    investmentSubtype === opt.value
                      ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-sm text-white/60">
                      {opt.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'entry_method' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">How should we track this?</h2>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setEntryMethod('amount')}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                  entryMethod === 'amount'
                    ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="font-semibold">
                    💵 I know my payment amount
                  </div>
                  <div className="text-sm text-white/60">
                    e.g., "$150 per quarter"
                  </div>
                </div>
              </button>

              {(investmentSubtype === 'dividends' ||
                investmentSubtype === 'interest' ||
                investmentSubtype === 'reit') && (
                <button
                  type="button"
                  onClick={() => setEntryMethod('yield_rate')}
                  className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                    entryMethod === 'yield_rate'
                      ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="font-semibold">
                      📈 I know my yield or interest rate
                    </div>
                    <div className="text-sm text-white/60">
                      Calculated from balance/portfolio
                    </div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => setEntryMethod('annual_total')}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                  entryMethod === 'annual_total'
                    ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="font-semibold">📅 I know my annual total</div>
                  <div className="text-sm text-white/60">
                    What you received last year
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 'amount_entry' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              {entryMethod === 'amount'
                ? 'Enter payment'
                : 'Enter annual total'}
            </h2>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                {entryMethod === 'amount'
                  ? 'Typical amount per payment'
                  : 'Total received last year'}
              </label>
              <CurrencyInput
                value={incomeAmount}
                onChange={setIncomeAmount}
                className="w-full border-b border-white/30 bg-transparent py-4 text-3xl font-bold focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-white/80">
                How predictable is this?
              </label>
              <div className="space-y-3">
                {PREDICTABILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPredictability(opt.value)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                      predictability === opt.value
                        ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-xs text-white/50">
                        {opt.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'yield_rate_entry' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Calculation details</h2>
            {investmentSubtype === 'interest' ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Account Balance
                  </label>
                  <CurrencyInput
                    value={principalAmount}
                    onChange={setPrincipalAmount}
                    className="w-full border-b border-white/30 bg-transparent py-4 text-3xl font-bold focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Annual Interest Rate (APY %)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={annualRate}
                      onChange={(e) => setAnnualRate(e.target.value)}
                      placeholder="0.00"
                      className="w-full border-b border-white/30 bg-transparent py-4 text-3xl font-bold focus:border-primary-500 focus:outline-none"
                    />
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-white/30">
                      %
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Portfolio/Holding Value
                  </label>
                  <CurrencyInput
                    value={portfolioValue}
                    onChange={setPortfolioValue}
                    className="w-full border-b border-white/30 bg-transparent py-4 text-3xl font-bold focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Dividend Yield (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={dividendYield}
                      onChange={(e) => setDividendYield(e.target.value)}
                      placeholder="0.00"
                      className="w-full border-b border-white/30 bg-transparent py-4 text-3xl font-bold focus:border-primary-500 focus:outline-none"
                    />
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-white/30">
                      %
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
              <h4 className="mb-2 text-xs font-bold uppercase text-blue-400">
                Estimated Monthly Income
              </h4>
              <div className="text-2xl font-bold">
                $
                {calculateMonthlyEstimate().toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        )}

        {step === 'reinvestment' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Cash vs. Reinvestment</h2>
            <p className="text-sm text-white/60">
              Is this income received as cash in your bank account?
            </p>

            <div className="grid grid-cols-1 gap-4">
              <button
                type="button"
                onClick={() => setIsReinvested(false)}
                className={`flex flex-col gap-2 rounded-xl border p-5 transition-all ${
                  !isReinvested
                    ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 font-bold">
                  <span className="text-2xl">💵</span>
                  Received as cash
                </div>
                <div className="text-sm text-white/50">
                  Transferred to my spending or savings account.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsReinvested(true)}
                className={`flex flex-col gap-2 rounded-xl border p-5 transition-all ${
                  isReinvested
                    ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 font-bold">
                  <span className="text-2xl">🔄</span>
                  Automatically reinvested
                </div>
                <div className="text-sm text-white/50">
                  DRIP or auto-reinvestment into the same fund.
                </div>
              </button>
            </div>

            {!isReinvested && (
              <div className="animate-slideDown">
                <label className="mb-2 block text-sm font-medium text-white/80">
                  What percentage do you keep as cash?
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={cashPercentage}
                    onChange={(e) => setCashPercentage(e.target.value)}
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-white/10 accent-primary-500"
                  />
                  <span className="w-12 text-right font-bold">
                    {cashPercentage}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'timing' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Timing & Frequency</h2>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                How often is this income paid?
              </label>
              <Select
                id="frequency"
                value={paymentFrequency}
                onChange={(v) => setPaymentFrequency(v as PaymentFrequency)}
                options={FREQUENCY_OPTIONS}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Next expected payment date (optional)
              </label>
              <input
                type="date"
                value={nextPaymentDate}
                onChange={(e) => setNextPaymentDate(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Review Details</h2>
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{name}</h3>
                  <p className="text-white/60">
                    {institutionName || 'Private Holding'}
                  </p>
                </div>
                <span className="text-4xl">
                  {SUBTYPE_OPTIONS.find((o) => o.value === investmentSubtype)
                    ?.icon || '📈'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/40">
                    Subtype
                  </div>
                  <div className="font-semibold capitalize">
                    {investmentSubtype?.replace('_', ' ')}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/40">
                    Account
                  </div>
                  <div className="font-semibold capitalize">
                    {accountType.replace('_', ' ')}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/40">
                    Frequency
                  </div>
                  <div className="font-semibold capitalize">
                    {paymentFrequency}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/40">
                    Flow
                  </div>
                  <div className="font-semibold capitalize">
                    {isReinvested ? 'Reinvested' : 'Cash'}
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="text-xs uppercase tracking-widest text-white/40">
                  Estimated Monthly
                </div>
                <div className="text-3xl font-bold text-primary-400">
                  $
                  {calculateMonthlyEstimate().toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-secondary-300 text-xs">
                  {entryMethod === 'yield_rate'
                    ? 'Calculated from yield/rate'
                    : `Based on your entry`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="mt-8 flex gap-3">
        <button
          onClick={handleBack}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 py-4 font-bold transition-all hover:bg-white/10"
        >
          Back
        </button>
        <button
          onClick={step === 'review' ? handleFinish : handleNext}
          disabled={
            (step === 'name_institution' && !name) ||
            (step === 'investment_type_select' && !investmentSubtype) ||
            (step === 'amount_entry' && !incomeAmount) ||
            (step === 'yield_rate_entry' &&
              investmentSubtype === 'interest' &&
              (!principalAmount || !annualRate)) ||
            (step === 'yield_rate_entry' &&
              investmentSubtype !== 'interest' &&
              (!portfolioValue || !dividendYield))
          }
          className="flex-[2] rounded-xl bg-gradient-to-r from-primary-600 to-blue-600 py-4 font-bold shadow-lg shadow-primary-900/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {step === 'review' ? 'Save Investment ✓' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
