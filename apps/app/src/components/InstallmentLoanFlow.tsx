import { useEffect, useMemo, useState } from 'react';
import type {
  CreateFinancialAccountInput,
  InstallmentLoanSubtype,
  PaymentFrequency,
} from '@rates/firebase-client';

import {
  calculatePayment,
  calculatePrincipal,
  calculateRate,
  calculateTerm,
  calculateProjectedDueDate,
  calculateRateFromPrincipalAndBalance,
} from '../utils/loanMath';
import { WizardProgressBar } from './WizardProgressBar';
import { Select } from './Select';
import { CurrencyInput } from './CurrencyInput';

/**
 * Icons and Labels duplicated for independence/reusability
 */
const LOAN_SUBTYPE_LABELS: Record<InstallmentLoanSubtype, string> = {
  mortgage: 'Mortgage',
  auto: 'Auto',
  personal: 'Personal',
  student: 'Student',
  other: 'Other',
};

const LOAN_SUBTYPE_ICONS: Record<InstallmentLoanSubtype, string> = {
  mortgage: '🏠',
  auto: '🚗',
  personal: '👤',
  student: '🎓',
  other: '📋',
};

const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annually: 'Semi-Annually',
  annually: 'Annually',
};

const formatCurrencyForDisplay = (val: string | number) => {
  if (!val) return '$0.00';
  const strVal = val.toString();
  const parts = strVal.split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? '.' + parts[1] : '';
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${formattedInteger}${decimalPart}`;
};

type LoanWizardStep =
  | 'subtype'
  | 'basics'
  | 'status'
  | 'calculation'
  | 'payment'
  | 'optional'
  | 'review';

interface InstallmentLoanFlowProps {
  onBack: () => void;
  // onCancel removed as unused
  onComplete: (data: Omit<CreateFinancialAccountInput, 'userId'>) => void;
  initialData?: Partial<CreateFinancialAccountInput>;
}

export function InstallmentLoanFlow({
  onBack,
  onComplete,
  initialData,
}: InstallmentLoanFlowProps) {
  const [step, setStep] = useState<LoanWizardStep>('subtype');

  // Form State
  const [subtype, setSubtype] = useState<InstallmentLoanSubtype | null>(null);
  const [nickname, setNickname] = useState('');
  const [currency, setCurrency] = useState<'COP' | 'USD'>('COP');

  // Status State
  const [isNewLoan, setIsNewLoan] = useState<boolean | null>(null); // true = new, false = existing
  const [startDate, setStartDate] = useState('');
  const [isPaymentStartDateSame, setIsPaymentStartDateSame] = useState(true);
  const [isStartDateUnknown, setIsStartDateUnknown] = useState(false);

  // Calculation State
  const [knownFields, setKnownFields] = useState<string[]>([]);

  // Financial Values (String for input, parsed for calc)
  const [principal, setPrincipal] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [term, setTerm] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');

  // Payment Schedule
  const [frequency, setFrequency] = useState<PaymentFrequency>('monthly');
  const [nextDueDate, setNextDueDate] = useState('');

  // Optional
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Derived / Calculated Values (for display/review)
  const [calculatedValues, setCalculatedValues] = useState<{
    payment?: number;
    term?: number;
    rate?: number;
    principal?: number;
    payoffDate?: string;
  }>({});

  // Initialize from initialData if provided
  // Initialize from initialData if provided
  useEffect(() => {
    if (initialData) {
      // Check for installment loan specific fields - verify by type discriminator or property presence
      if (
        initialData.accountType === 'installment_loan' ||
        'loanSubtype' in initialData
      ) {
        const data = initialData as { loanSubtype?: InstallmentLoanSubtype };
        if (data.loanSubtype) setSubtype(data.loanSubtype);
      }

      // Common fields
      if (initialData.accountName) setNickname(initialData.accountName);
      if (initialData.currency)
        setCurrency(initialData.currency as 'COP' | 'USD');
    }
  }, [initialData]);

  // --- Logic ---

  // Auto-calculate missing values when inputs change (debounce could be added)
  // Mirror Principal to Current Balance for New Loans
  useEffect(() => {
    if (isNewLoan) {
      setCurrentBalance(principal);
    }
  }, [isNewLoan, principal]);

  // Auto-calculate missing values when inputs change (debounce could be added)
  useEffect(() => {
    const pInput = parseFloat(principal); // Original Principal
    const bInput = parseFloat(currentBalance); // Current Balance

    // Use Principal as PV if available, otherwise use Current Balance
    const pv = pInput > 0 ? pInput : bInput;

    const r = parseFloat(interestRate);
    const n = parseFloat(term);
    const m = parseFloat(monthlyPayment);

    // Calculate elapsed months if possible
    let t = 0;
    if (startDate) {
      const start = new Date(startDate);
      const now = new Date();
      // Simple diff in months
      t =
        (now.getFullYear() - start.getFullYear()) * 12 +
        (now.getMonth() - start.getMonth());
      if (t < 0) t = 0;
    }

    // We only create derived values if we have enough inputs (Rule of 3).

    // Case 5: Solve for Rate & Term using Principal + Balance + Payment + Time
    // This is the "Existing Loan" magic case where user knows amounts but not rate.
    if (
      pInput > 0 &&
      bInput > 0 &&
      m > 0 &&
      (!r || r <= 0) &&
      (!n || n <= 0) &&
      t > 0
    ) {
      const calculatedRate = calculateRateFromPrincipalAndBalance(
        pInput,
        bInput,
        m,
        t
      );
      if (calculatedRate > 0) {
        // Once rate is found, we can find the term
        const calculatedTerm = calculateTerm(pInput, calculatedRate, m);
        setCalculatedValues((prev) => ({
          ...prev,
          rate: parseFloat(calculatedRate.toFixed(2)),
          term: calculatedTerm,
        }));
      }
    }
    // Case 1: Solve for Payment (PV + r + n -> P)
    else if (pv > 0 && r >= 0 && n > 0 && !m) {
      const val = calculatePayment(pv, r, n);
      setCalculatedValues((prev) => ({ ...prev, payment: val }));
    }
    // Case 2: Solve for Term (PV + r + m -> n)
    else if (pv > 0 && r >= 0 && m > 0 && !n) {
      const val = calculateTerm(pv, r, m);
      setCalculatedValues((prev) => ({ ...prev, term: val }));
    }
    // Case 3: Solve for Principal/PV (m + r + n -> PV)
    else if (m > 0 && r >= 0 && n > 0 && !pv) {
      const val = calculatePrincipal(m, r, n);
      // If we solved for PV, it could be Principal OR Balance depending on context,
      // but usually implies "Loan Amount" for a given term/payment.
      setCalculatedValues((prev) => ({ ...prev, principal: val }));
    }
    // Case 4: Solve for Rate (PV + m + n -> r)
    else if (pv > 0 && m > 0 && n > 0 && !r) {
      const val = calculateRate(pv, m, n);
      setCalculatedValues((prev) => ({ ...prev, rate: val }));
    } else {
      setCalculatedValues({});
    }
  }, [
    principal,
    currentBalance,
    interestRate,
    term,
    monthlyPayment,
    startDate,
  ]);

  // --- Validation Helpers ---
  const canContinueSubtype = !!subtype;
  const canContinueBasics = nickname.trim().length > 0;
  const canContinueStatus = useMemo(() => {
    if (isNewLoan === null) return false;
    if (isNewLoan) {
      // New Loan: Start Date required.
      return !!startDate;
    } else {
      // Existing Loan: Start Date required UNLESS "Unknown" is checked.
      if (isStartDateUnknown) return true;
      return !!startDate;
    }
  }, [isNewLoan, startDate, isStartDateUnknown]);

  // Calculation Validation
  // We need at least minimal info to proceed.
  // "Minimal info" = Balance OR Principal AND Payment (usually).
  // The logic is: The user must fill what they checked.
  const canContinueCalculation = useMemo(() => {
    // If they checked boxes, the corresponding inputs must be filled.
    if (
      knownFields.includes('principal') &&
      (!principal || parseFloat(principal) <= 0)
    )
      return false;
    if (
      knownFields.includes('balance') &&
      (!currentBalance || parseFloat(currentBalance) <= 0)
    )
      return false;
    if (
      knownFields.includes('rate') &&
      (!interestRate || parseFloat(interestRate) < 0)
    )
      return false;
    if (knownFields.includes('term') && (!term || parseFloat(term) <= 0))
      return false;
    if (
      knownFields.includes('payment') &&
      (!monthlyPayment || parseFloat(monthlyPayment) <= 0)
    )
      return false;

    // At least ONE monetary value is needed usually
    const hasMoney = principal || currentBalance || monthlyPayment;
    return !!hasMoney;
  }, [
    knownFields,
    principal,
    currentBalance,
    interestRate,
    term,
    monthlyPayment,
  ]);

  const canContinuePayment = !!nextDueDate;

  // --- Navigation ---
  const handleNext = () => {
    if (step === 'subtype') setStep('basics');
    else if (step === 'basics') setStep('status');
    else if (step === 'status') {
      setStep('calculation');
      // Autofill Next Due Date logic
      if (isNewLoan && isPaymentStartDateSame && startDate) {
        setNextDueDate(startDate);
      } else if (!isNewLoan && startDate && !isStartDateUnknown) {
        const projected = calculateProjectedDueDate(new Date(startDate));
        // Format as YYYY-MM-DD for input type="date"
        setNextDueDate(projected.toISOString().split('T')[0]);
      }
    } else if (step === 'calculation') setStep('payment');
    else if (step === 'payment') setStep('optional');
    else if (step === 'optional') setStep('review');
  };

  const handleBackStep = () => {
    if (step === 'subtype') onBack();
    else if (step === 'basics') setStep('subtype');
    else if (step === 'status') setStep('basics');
    else if (step === 'calculation') setStep('status');
    else if (step === 'payment') setStep('calculation');
    else if (step === 'optional') setStep('payment');
    else if (step === 'review') setStep('optional');
  };

  const handleFinish = () => {
    if (!subtype) return;

    // Use calculated values if input is missing
    const finalRate = interestRate
      ? parseFloat(interestRate)
      : (calculatedValues.rate ?? 0);
    const finalPayment = monthlyPayment
      ? parseFloat(monthlyPayment)
      : (calculatedValues.payment ?? 0);
    const finalTerm = term ? parseInt(term) : (calculatedValues.term ?? 0);
    const finalPrincipal = principal
      ? parseFloat(principal)
      : (calculatedValues.principal ?? 0);
    const finalBalance = currentBalance
      ? parseFloat(currentBalance)
      : finalPrincipal; // Fallback

    // Construct payload with strict types and spread for optional fields
    const payload = {
      accountType: 'installment_loan' as const,
      loanSubtype: subtype,
      accountName: nickname,
      accountDescription: notes || `${LOAN_SUBTYPE_LABELS[subtype]} Loan`,
      accountNumber: accountNumber || crypto.randomUUID(), // Autogenerate if empty
      currency,
      status: 'active' as const,
      annualInterestRate: finalRate,
      paymentFrequency: frequency,
      currentPrincipal: {
        amount: finalBalance,
        currency,
      },
      paymentLog: [],
      ...(finalPayment > 0
        ? { scheduledPayment: { amount: finalPayment, currency } }
        : {}),
      ...(finalPrincipal > 0
        ? { originalPrincipal: { amount: finalPrincipal, currency } }
        : {}),
      ...(finalTerm > 0 ? { termInPayments: finalTerm } : {}),
      ...(!isStartDateUnknown || !isNewLoan
        ? {
            contractStartDate:
              !isStartDateUnknown && startDate
                ? new Date(startDate)
                : new Date(),
          }
        : {}),
      ...(nextDueDate ? { nextDueDate: new Date(nextDueDate) } : {}),
    };

    onComplete(payload);
  };

  // --- Render Steps ---

  const steps: LoanWizardStep[] = [
    'subtype',
    'basics',
    'status',
    'calculation',
    'payment',
    'optional',
    'review',
  ];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="flex h-full flex-col text-white">
      <WizardProgressBar
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        label={step.replace('_', ' ')}
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 pr-2">
        {step === 'subtype' && (
          <div className="animate-fadeIn">
            <h2 className="mb-4 text-xl font-bold">
              What type of loan is this?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(
                Object.keys(LOAN_SUBTYPE_LABELS) as InstallmentLoanSubtype[]
              ).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSubtype(key)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    subtype === key
                      ? 'border-primary-500 bg-primary-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-3xl">{LOAN_SUBTYPE_ICONS[key]}</span>
                  <span className="text-sm font-semibold">
                    {LOAN_SUBTYPE_LABELS[key]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'basics' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Give this account a nickname
              </label>
              <input
                type="text"
                autoFocus
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g., Chase Mortgage, Honda Civic Loan"
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
                  { value: 'COP', label: 'COP (Colombian Peso)' },
                  { value: 'USD', label: 'USD (US Dollar)' },
                ]}
              />
            </div>
          </div>
        )}

        {step === 'status' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              Is this a new or existing loan?
            </h2>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setIsNewLoan(true)}
                className={`flex items-center gap-4 rounded-lg border p-4 text-left transition-all ${
                  isNewLoan === true
                    ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/40">
                  {isNewLoan === true && (
                    <div className="h-2.5 w-2.5 rounded-full bg-primary-400" />
                  )}
                </div>
                <div>
                  <div className="font-semibold">Brand new loan</div>
                  <div className="text-sm text-white/60">
                    I haven't made any payments yet
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsNewLoan(false)}
                className={`flex items-center gap-4 rounded-lg border p-4 text-left transition-all ${
                  isNewLoan === false
                    ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/40">
                  {isNewLoan === false && (
                    <div className="h-2.5 w-2.5 rounded-full bg-primary-400" />
                  )}
                </div>
                <div>
                  <div className="font-semibold">Existing loan</div>
                  <div className="text-sm text-white/60">
                    I've already made some payments
                  </div>
                </div>
              </button>
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ${isNewLoan !== null ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
              {isNewLoan ? (
                // --- NEW LOAN LOGIC ---
                <div className="flex animate-fadeIn flex-col gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      When does the loan start?
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="-ml-2 flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={isPaymentStartDateSame}
                        onChange={(e) =>
                          setIsPaymentStartDateSame(e.target.checked)
                        }
                        className="h-4 w-4 rounded border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                      />
                      <span className="text-sm text-white/80">
                        First payment is on the same date
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
                // --- EXISTING LOAN LOGIC ---
                <div className="flex animate-fadeIn flex-col gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      When was the first scheduled payment?
                    </label>
                    <div className="flex flex-col gap-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        disabled={isStartDateUnknown}
                        className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <label className="-ml-2 flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={isStartDateUnknown}
                          onChange={(e) => {
                            setIsStartDateUnknown(e.target.checked);
                            if (e.target.checked) setStartDate('');
                          }}
                          className="h-4 w-4 rounded border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                        />
                        <span className="text-sm text-white/60">
                          I don't remember, add later
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'calculation' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <div>
              <h2 className="mb-1 text-lg font-bold">Smart Calculation</h2>
              <p className="text-sm text-white/60">
                Select what you know, and we'll calculate the rest.
              </p>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'principal', label: 'Original Amount' },
                { id: 'balance', label: 'Current Balance' },
                { id: 'rate', label: 'Interest Rate' },
                { id: 'term', label: 'Term (Length)' },
                { id: 'payment', label: 'Monthly Payment' },
              ]
                .filter((f) => !isNewLoan || f.id !== 'balance')
                .map((field) => (
                  <label
                    key={field.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10"
                  >
                    <input
                      type="checkbox"
                      checked={knownFields.includes(field.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (field.id === 'principal' && isNewLoan) {
                          // Mirror selection to balance for new loans
                          setKnownFields((prev) => {
                            const next = checked
                              ? [...prev, 'principal', 'balance']
                              : prev.filter(
                                  (f) => f !== 'principal' && f !== 'balance'
                                );
                            return [...new Set(next)];
                          });
                        } else {
                          setKnownFields((prev) =>
                            checked
                              ? [...prev, field.id]
                              : prev.filter((f) => f !== field.id)
                          );
                        }
                      }}
                      className="h-4 w-4 rounded border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                    />
                    <span className="text-sm font-medium">{field.label}</span>
                  </label>
                ))}
            </div>

            <div className="my-2 h-px bg-white/10" />

            {/* Dynamic Inputs */}
            <div className="grid animate-slideUp grid-cols-1 gap-4">
              {knownFields.includes('principal') && (
                <div className="animate-fadeIn">
                  <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">
                    Original Amount ({currency})
                  </label>
                  <CurrencyInput
                    value={principal}
                    onChange={setPrincipal}
                    placeholder="$0.00"
                    className="w-full border-b border-white/30 bg-transparent py-2 text-xl placeholder-white/10 focus:border-primary-500 focus:outline-none"
                  />
                </div>
              )}
              {knownFields.includes('balance') && !isNewLoan && (
                <div className="animate-fadeIn">
                  <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">
                    Current Balance ({currency})
                  </label>
                  <CurrencyInput
                    value={currentBalance}
                    onChange={setCurrentBalance}
                    placeholder="$0.00"
                    className="w-full border-b border-white/30 bg-transparent py-2 text-xl placeholder-white/10 focus:border-primary-500 focus:outline-none"
                  />
                </div>
              )}
              {knownFields.includes('rate') && (
                <div className="animate-fadeIn">
                  <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">
                    Interest Rate (% Annual)
                  </label>
                  <input
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="0.00"
                    className="w-full border-b border-white/30 bg-transparent py-2 text-xl placeholder-white/10 focus:border-primary-500 focus:outline-none"
                  />
                </div>
              )}
              {knownFields.includes('term') && (
                <div className="animate-fadeIn">
                  <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">
                    Term (Months)
                  </label>
                  <input
                    type="number"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="0"
                    className="w-full border-b border-white/30 bg-transparent py-2 text-xl placeholder-white/10 focus:border-primary-500 focus:outline-none"
                  />
                </div>
              )}
              {knownFields.includes('payment') && (
                <div className="animate-fadeIn">
                  <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">
                    Monthly Payment ({currency})
                  </label>
                  <CurrencyInput
                    value={monthlyPayment}
                    onChange={setMonthlyPayment}
                    placeholder="$0.00"
                    className="w-full border-b border-white/30 bg-transparent py-2 text-xl placeholder-white/10 focus:border-primary-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Calculated Results Preview */}
            {((calculatedValues.payment ?? 0) > 0 ||
              (calculatedValues.term ?? 0) > 0 ||
              (calculatedValues.rate ?? 0) > 0 ||
              (calculatedValues.principal ?? 0) > 0) && (
              <div className="mt-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                <h4 className="mb-2 text-xs font-bold uppercase text-blue-400">
                  Estimated Values
                </h4>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  {calculatedValues.payment && (
                    <div>
                      Payment:{' '}
                      <span className="font-mono text-white">
                        ${calculatedValues.payment.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {calculatedValues.term && (
                    <div>
                      Term:{' '}
                      <span className="font-mono text-white">
                        {calculatedValues.term} mo
                      </span>
                    </div>
                  )}
                  {calculatedValues.rate && (
                    <div>
                      Rate:{' '}
                      <span className="font-mono text-white">
                        {calculatedValues.rate.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {calculatedValues.principal && (
                    <div>
                      Principal:{' '}
                      <span className="font-mono text-white">
                        ${calculatedValues.principal.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'payment' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Payment Schedule</h2>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold uppercase tracking-wide text-white/90">
                How often do you make payments?
              </label>
              <Select
                value={frequency}
                onChange={(v) => setFrequency(v as PaymentFrequency)}
                options={(
                  Object.keys(PAYMENT_FREQUENCY_LABELS) as PaymentFrequency[]
                ).map((freq) => ({
                  value: freq,
                  label: PAYMENT_FREQUENCY_LABELS[freq],
                }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold uppercase tracking-wide text-white/90">
                When is the next payment due?
              </label>
              <input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        )}

        {step === 'optional' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Optional Details</h2>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Account Number (Private)
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g., 000-1234-5678"
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any extra details..."
                rows={4}
                className="w-full resize-none rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <div className="rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/20 to-emerald-600/10 p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-3xl">
                {subtype ? LOAN_SUBTYPE_ICONS[subtype] : '💰'}
              </div>
              <h2 className="mb-1 text-2xl font-bold text-white">{nickname}</h2>
              <div className="font-medium text-green-300">
                {LOAN_SUBTYPE_LABELS[subtype ?? 'personal']} Loan
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/60">Balance</span>
                <span className="font-mono font-bold">
                  {formatCurrencyForDisplay(
                    (currentBalance ||
                      principal ||
                      calculatedValues.principal) ??
                      0
                  )}{' '}
                  {currency}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/60">Monthly Payment</span>
                <span className="font-mono font-bold">
                  {formatCurrencyForDisplay(
                    (monthlyPayment || calculatedValues.payment) ?? 0
                  )}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/60">Interest Rate</span>
                <span className="font-mono font-bold">
                  {(
                    (interestRate || calculatedValues.rate) ??
                    0
                  ).toLocaleString()}
                  %
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Next Due</span>
                <span className="font-medium">{nextDueDate}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="mt-auto flex shrink-0 items-center justify-between border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={handleBackStep}
          className="rounded-lg px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
        >
          Back
        </button>

        {step === 'review' ? (
          <button
            type="button"
            onClick={handleFinish}
            className="ds-button-gradient rounded-lg px-8 py-3 font-bold shadow-lg"
          >
            Create Account
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={
              (step === 'subtype' && !canContinueSubtype) ||
              (step === 'basics' && !canContinueBasics) ||
              (step === 'status' && !canContinueStatus) ||
              (step === 'calculation' && !canContinueCalculation) ||
              (step === 'payment' && !canContinuePayment)
            }
            className="ds-button-gradient rounded-lg px-8 py-3 font-bold shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
