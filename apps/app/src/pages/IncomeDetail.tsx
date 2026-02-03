import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type {
  Income,
  FinancialAccount,
  InvestmentIncome,
} from '@rates/firebase-client';
import { getUserIncomes } from '../services/incomes';
import { getUserFinancialAccounts } from '../services/financialAccounts';
import {
  formatCurrency,
  formatIncomeStatus,
  getIncomeStatusColor,
} from '../utils/formatters';
import { ExtraPaycheckMonthWidget } from '../components/SalaryInsights/ExtraPaycheckMonthWidget';
import { RealHourlyRateWidget } from '../components/SalaryInsights/RealHourlyRateWidget';
import { JobLossRunwayWidget } from '../components/SalaryInsights/JobLossRunwayWidget';
import { IncomeDependencyWidget } from '../components/SalaryInsights/IncomeDependencyWidget';
import { PaycheckBillsAlignmentWidget } from '../components/SalaryInsights/PaycheckBillsAlignmentWidget';
import { RaiseImpactWidget } from '../components/SalaryInsights/RaiseImpactWidget';
import { SalaryYTDWidget } from '../components/SalaryInsights/SalaryYTDWidget';

// Freelance Insights
import { IncomeVolatilityWidget } from '../components/FreelanceInsights/IncomeVolatilityWidget';
import { TaxSetAsideWidget } from '../components/FreelanceInsights/TaxSetAsideWidget';
import { ClientConcentrationWidget } from '../components/FreelanceInsights/ClientConcentrationWidget';
import { FreelanceStabilityScoreWidget } from '../components/FreelanceInsights/FreelanceStabilityScoreWidget';

// Rental Insights
import { TrueCashFlowWidget } from '../components/RentalInsights/TrueCashFlowWidget';
import { VacancyCostWidget } from '../components/RentalInsights/VacancyCostWidget';
import { WealthBuildingWidget } from '../components/RentalInsights/WealthBuildingWidget';
import { InvestmentPerformanceWidget } from '../components/RentalInsights/InvestmentPerformanceWidget';
import { ExpenseHealthWidget } from '../components/RentalInsights/ExpenseHealthWidget';

// Investment Insights
import { InvestmentReliabilityWidget } from '../components/InvestmentInsights/InvestmentReliabilityWidget';
import { DividendCalendarWidget } from '../components/InvestmentInsights/DividendCalendarWidget';
import { TaxAdjustedIncomeWidget } from '../components/InvestmentInsights/TaxAdjustedIncomeWidget';
import { FinancialIndependenceWidget } from '../components/InvestmentInsights/FinancialIndependenceWidget';

export default function IncomeDetail() {
  const { incomeId } = useParams<{ incomeId: string }>();
  const navigate = useNavigate();
  const [income, setIncome] = useState<Income | null>(null);
  const [allIncomes, setAllIncomes] = useState<Income[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!incomeId) return;

    try {
      setLoading(true);
      setError(null);

      const [incomesData, accountsData] = await Promise.all([
        getUserIncomes(),
        getUserFinancialAccounts(),
      ]);

      const foundIncome = incomesData.find((inc) => inc.id === incomeId);
      if (!foundIncome) {
        setError('Income not found');
        return;
      }

      setIncome(foundIncome);
      setAllIncomes(incomesData);
      setAccounts(accountsData);
    } catch (err) {
      console.error('Error loading income detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [incomeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center text-white/80">
        <div className="mb-4 h-[50px] w-[50px] animate-spin rounded-full border-4 border-neutral-600/30 border-t-primary-500"></div>
        <p>Loading details...</p>
      </div>
    );
  }

  if (error || !income) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-white">
        <h2 className="mb-4 text-2xl font-bold text-danger-400">Error</h2>
        <p className="mb-8">{error || 'Income not found'}</p>
        <button
          onClick={() => {
            void navigate(-1);
          }}
          className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-600/40 bg-white/10 px-8 py-3 text-sm font-semibold text-white backdrop-blur-[10px] transition-all duration-300 ease-in-out hover:-translate-x-1 hover:bg-white/15"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto box-border max-w-[1400px] animate-fadeIn-slow px-4 py-4 md:p-6">
      {/* Header */}
      <div className="mb-10 flex flex-wrap items-start justify-between gap-8 border-b border-neutral-700/30 pb-8">
        <div className="min-w-0 flex-1">
          <div className="mb-6 flex gap-3">
            <button
              onClick={() => {
                if (income?.type) {
                  void navigate(`/incomes/${income.type}`);
                } else {
                  void navigate('/dashboard');
                }
              }}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-600/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-[10px] transition-all duration-300 ease-in-out hover:-translate-x-1 hover:bg-white/15"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.5 15L7.5 10L12.5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back
            </button>
          </div>

          <div className="mb-4 flex items-center gap-4">
            <h1 className="m-0 bg-gradient-to-br from-white to-white/80 bg-clip-text text-3xl font-bold -tracking-[0.5px] text-transparent text-white md:text-5xl">
              {income.name}
            </h1>
            <span
              className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-lg"
              style={{ backgroundColor: getIncomeStatusColor(income.status) }}
            >
              {formatIncomeStatus(income.status)}
            </span>
          </div>

          <p className="m-0 max-w-2xl text-lg leading-relaxed text-white/60">
            {income.notes || `Your ${income.type} income source.`}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 md:mt-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            Expected Amount
          </div>
          <div className="text-4xl font-black text-white">
            {formatCurrency(
              income.type === 'salary'
                ? income.takeHomePay?.amount || 0
                : income.type === 'freelance'
                  ? income.estimatedMonthlyIncome?.amount ||
                    income.retainerAmount?.amount ||
                    0
                  : income.type === 'rental'
                    ? income.rentalAmount?.amount || 0
                    : 0,
              income.currency
            )}
          </div>
          <div className="text-xs font-bold text-primary-400">
            {income.type === 'salary'
              ? income.paymentFrequency
              : income.type === 'freelance'
                ? 'Monthly Estimate'
                : income.type === 'rental'
                  ? income.rentalFrequency
                  : income.type === 'investments'
                    ? income.paymentFrequency
                    : ''}
          </div>
        </div>
      </div>

      {/* Type-Specific Insights */}
      {income.type === 'salary' && (
        <div className="space-y-8">
          <h2 className="mb-6 text-2xl font-bold text-white">
            Salary Insights
          </h2>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <ExtraPaycheckMonthWidget salary={income} />
            <RealHourlyRateWidget salary={income} />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <JobLossRunwayWidget
                salary={income}
                allIncomes={allIncomes}
                accounts={accounts}
              />
            </div>
            <IncomeDependencyWidget
              targetIncome={income}
              allIncomes={allIncomes}
            />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <RaiseImpactWidget salary={income} />
            <SalaryYTDWidget salary={income} />
          </div>

          <PaycheckBillsAlignmentWidget salary={income} accounts={accounts} />
        </div>
      )}

      {/* Freelance Insights */}
      {income.type === 'freelance' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-2xl font-bold text-white">
              Freelance Insights
            </h2>
            <div className="flex gap-2">
              <span className="rounded-full bg-primary-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-400 ring-1 ring-primary-500/20">
                Live Analysis
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <FreelanceStabilityScoreWidget income={income} />
            </div>
            <div className="lg:col-span-2">
              <IncomeVolatilityWidget income={income} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <TaxSetAsideWidget income={income} />
            <ClientConcentrationWidget income={income} />
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center italic">
            <p className="text-white/40">
              Insights are calculated based on your historical payment logs and
              estimated income setup.
            </p>
          </div>
        </div>
      )}

      {/* Rental Insights */}
      {income.type === 'rental' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-2xl font-bold text-white">
              Rental Performance Insights
            </h2>
            <div className="flex gap-2">
              <span className="rounded-full bg-primary-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-400 ring-1 ring-primary-500/20">
                Property Analysis
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <TrueCashFlowWidget rental={income} accounts={accounts} />
            {income.isCurrentlyVacant && <VacancyCostWidget rental={income} />}
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <WealthBuildingWidget rental={income} accounts={accounts} />
            </div>
            <div className="lg:col-span-1">
              <ExpenseHealthWidget rental={income} />
            </div>
          </div>

          <InvestmentPerformanceWidget rental={income} accounts={accounts} />

          <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center italic">
            <p className="text-white/40">
              Insights are calculated based on your property configuration and
              linked financial accounts.
            </p>
          </div>
        </div>
      )}

      {/* Investment Insights */}
      {income.type === 'investments' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-2xl font-bold text-white">
              Investment Insights
            </h2>
            <div className="flex gap-2">
              <span className="rounded-full bg-primary-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-400 ring-1 ring-primary-500/20">
                Portfolio Analysis
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <InvestmentReliabilityWidget
              investments={allIncomes.filter(
                (inc): inc is InvestmentIncome => inc.type === 'investments'
              )}
            />
            <DividendCalendarWidget
              investments={allIncomes.filter(
                (inc): inc is InvestmentIncome => inc.type === 'investments'
              )}
              currency={income.currency}
            />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FinancialIndependenceWidget
                investments={allIncomes.filter(
                  (inc): inc is InvestmentIncome => inc.type === 'investments'
                )}
                currency={income.currency}
              />
            </div>
            <div className="lg:col-span-1">
              <TaxAdjustedIncomeWidget
                investments={allIncomes.filter(
                  (inc): inc is InvestmentIncome => inc.type === 'investments'
                )}
                currency={income.currency}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center italic">
            <p className="text-white/40">
              Insights are calculated based on your entire investment portfolio
              to provide a comprehensive view of your financial stability and
              tax efficiency.
            </p>
          </div>
        </div>
      )}

      {/* Fallback for other types (Future) */}
      {income.type !== 'salary' &&
        income.type !== 'freelance' &&
        income.type !== 'rental' &&
        income.type !== 'investments' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-xl text-white/60">
              Insights for {income.type} income are coming soon!
            </p>
          </div>
        )}
    </div>
  );
}
