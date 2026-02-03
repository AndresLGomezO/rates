import { useNavigate } from 'react-router-dom';
import type { Income } from '@rates/firebase-client';
import {
  formatCurrency,
  formatDate,
  getIncomeStatusColor,
  formatIncomeStatus,
} from '../utils/formatters';

interface IncomeCardProps {
  income: Income & { id: string };
}

const INCOME_TYPE_ICONS: Record<string, string> = {
  salary: '💼',
  freelance: '🚀',
  rental: '🏠',
  investments: '📈',
  benefits: '🛡️',
  other: '📋',
};

const INCOME_TYPE_LABELS: Record<string, string> = {
  salary: 'Salary & Wages',
  freelance: 'Freelance & Gig',
  rental: 'Rental Income',
  investments: 'Investments',
  benefits: 'Benefits',
  other: 'Other',
};

export function IncomeCard({ income }: IncomeCardProps) {
  const navigate = useNavigate();

  const getIncomeAmount = () => {
    switch (income.type) {
      case 'salary':
        return income.takeHomePay?.amount || income.annualSalary?.amount || 0;
      case 'freelance':
        return (
          income.estimatedMonthlyIncome?.amount ||
          income.rateAmount?.amount ||
          0
        );
      case 'rental':
        return income.rentalAmount?.amount || 0;
      case 'investments':
        return income.incomeAmount?.amount || 0;
      case 'benefits':
        return income.benefitAmount?.amount || 0;
      case 'other':
        return income.incomeAmount?.amount || 0;
      default:
        return 0;
    }
  };

  const getFrequencyLabel = () => {
    switch (income.type) {
      case 'salary':
        return income.paymentFrequency;
      case 'freelance':
        return income.typicalPaymentFrequency || 'Variable';
      case 'rental':
        return income.rentalFrequency;
      case 'investments':
        return income.paymentFrequency;
      case 'benefits':
        return income.paymentFrequency;
      case 'other':
        return income.paymentFrequency || 'Irregular';
      default:
        return '';
    }
  };

  const amount = getIncomeAmount();
  const frequency = getFrequencyLabel();

  return (
    <div
      onClick={() => {
        void navigate(`/income/${income.id}`);
      }}
      className="ds-card-light group cursor-pointer p-6 transition-all hover:scale-[1.01] hover:shadow-xl active:scale-[0.99]"
    >
      <div className="mb-6 flex items-start justify-between border-b border-neutral-700/30 pb-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl shadow-inner transition-transform group-hover:scale-110">
            {INCOME_TYPE_ICONS[income.type] || '💰'}
          </div>
          <div>
            <h3 className="m-0 mb-1 text-xl font-bold text-white group-hover:text-primary-400">
              {income.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                {INCOME_TYPE_LABELS[income.type]}
              </span>
              <span className="h-1 w-1 rounded-full bg-white/20"></span>
              <span className="text-xs text-white/50">{frequency}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <span
            className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm"
            style={{
              backgroundColor: getIncomeStatusColor(income.status),
            }}
          >
            {formatIncomeStatus(income.status)}
          </span>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {formatCurrency(amount, income.currency)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-white/40">
          Last updated: {formatDate(income.updatedAt)}
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-primary-600/10 px-4 py-2 text-sm font-semibold text-primary-400 transition-all group-hover:bg-primary-600 group-hover:text-white">
          <span>View Insights</span>
          <span className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </div>
      </div>
    </div>
  );
}
