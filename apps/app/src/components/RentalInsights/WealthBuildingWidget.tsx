import type {
  RentalIncome,
  FinancialAccount,
  InstallmentLoanAccount,
} from '@rates/firebase-client';
import { RentalInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface WealthBuildingWidgetProps {
  rental: RentalIncome;
  accounts: FinancialAccount[];
}

export function WealthBuildingWidget({
  rental,
  accounts,
}: WealthBuildingWidgetProps) {
  const mortgage = rental.linkedMortgageAccountId
    ? (accounts.find(
        (a) => a.id === rental.linkedMortgageAccountId
      ) as InstallmentLoanAccount)
    : null;

  if (!mortgage) return null;

  const analysis = RentalInsightsService.calculateWealthBuilding(
    rental,
    mortgage
  );

  return (
    <div className="ds-card-light overflow-hidden">
      <div className="border-b border-white/10 bg-white/5 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <span>🏠</span>
          <span>Your Tenant is Buying This Property</span>
        </h3>
        <p className="mt-1 text-sm text-white/50">
          Reframing rental income as a long-term wealth building tool.
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Main Stats */}
          <div>
            <div className="mb-6">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                Monthly Wealth Gain
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">
                  {formatCurrency(
                    analysis.totalMonthlyBenefit,
                    analysis.currency
                  )}
                </span>
                <span className="text-sm font-bold text-primary-400">/ mo</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary-500" />
                  <span className="text-xs text-white/60">
                    Cash Flow (Profit)
                  </span>
                </div>
                <span className="text-xs font-bold text-white">
                  {formatCurrency(analysis.monthlyCashFlow, analysis.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-warning-500" />
                  <span className="text-xs text-white/60">
                    Principal Paydown
                  </span>
                </div>
                <span className="text-xs font-bold text-white">
                  {formatCurrency(analysis.monthlyPrincipal, analysis.currency)}
                </span>
              </div>
            </div>

            {analysis.returnOnEquity !== null && (
              <div className="mt-6">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                  Return on Equity (ROE)
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-black text-white">
                    {analysis.returnOnEquity.toFixed(1)}%
                  </div>
                  <div className="h-8 w-[1px] bg-white/10" />
                  <p className="text-[10px] leading-tight text-white/40">
                    The annual return on your
                    <br />
                    invested equity.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 5-Year Outlook */}
          <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">
              5-Year Equity Progress
            </h4>
            <div className="space-y-4">
              {analysis.yearByYearProjection.map((year) => (
                <div key={year.year} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
                    <span>{year.year}</span>
                    <span>
                      +{formatCurrency(year.principal, analysis.currency)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full bg-warning-500/60"
                      style={{
                        width: `${(year.equity / analysis.yearByYearProjection[4].equity) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-white/5 pt-4 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                5-Year Total Principal Paid by Tenant
              </div>
              <div className="text-xl font-black text-white">
                {formatCurrency(
                  analysis.fiveYearPrincipalPaydown,
                  analysis.currency
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
