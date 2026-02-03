import type {
  RentalIncome,
  FinancialAccount,
  InstallmentLoanAccount,
} from '@rates/firebase-client';
import { RentalInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface InvestmentPerformanceWidgetProps {
  rental: RentalIncome;
  accounts: FinancialAccount[];
}

export function InvestmentPerformanceWidget({
  rental,
  accounts,
}: InvestmentPerformanceWidgetProps) {
  const mortgage = rental.linkedMortgageAccountId
    ? (accounts.find(
        (a) => a.id === rental.linkedMortgageAccountId
      ) as InstallmentLoanAccount)
    : null;

  const analysis = RentalInsightsService.calculateInvestmentPerformance(
    rental,
    mortgage
  );

  if (!analysis) {
    return (
      <div className="ds-card-light p-8 text-center">
        <p className="text-sm italic text-white/40">
          Add the property's estimated market value to see investment
          performance and comparison metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="ds-card-light overflow-hidden">
      <div className="border-b border-white/10 bg-white/5 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <span>📊</span>
          <span>Investment Performance</span>
        </h3>
        <p className="mt-1 text-sm text-white/50">
          Comparing your property's ROI against typical market benchmarks.
        </p>
      </div>

      <div className="p-6">
        <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* ROI Bars */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/60">
                  Your Property (Cash + Equity)
                </span>
                <span className="text-xs font-bold text-white">
                  {analysis.totalROE.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full bg-primary-500"
                  style={{
                    width: `${Math.min(100, (analysis.totalROE / 25) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/60">
                  With Estimated Appreciation (3%)
                </span>
                <span className="text-xs font-bold text-primary-400">
                  {analysis.totalROEWithAppreciation.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full bg-primary-400"
                  style={{
                    width: `${Math.min(100, (analysis.totalROEWithAppreciation / 25) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/40">
                  S&P 500 Historical Avg
                </span>
                <span className="text-xs font-bold text-white/40">10.0%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-white/20" style={{ width: '40%' }} />
              </div>
            </div>
          </div>

          {/* Sell Analysis */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">
              Scenario: Selling Now
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">
                  Estimated Net Proceeds
                </span>
                <span className="text-xs font-bold text-white">
                  {formatCurrency(
                    analysis.saleScenario.netProceeds,
                    analysis.currency
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">
                  Alternative 7% Annual Return
                </span>
                <span className="text-xs font-bold text-white">
                  {formatCurrency(
                    analysis.saleScenario.alternativeReturn,
                    analysis.currency
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-xs font-bold text-white">
                  Retaining Benefit
                </span>
                <span
                  className={`text-xs font-bold ${analysis.saleScenario.difference > 0 ? 'text-primary-400' : 'text-danger-400'}`}
                >
                  {formatCurrency(
                    Math.abs(analysis.saleScenario.difference),
                    analysis.currency
                  )}{' '}
                  / year
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`flex items-center gap-4 rounded-xl px-6 py-4 ${analysis.saleScenario.recommendation === 'keep' ? 'border border-primary-500/20 bg-primary-500/10' : 'border border-warning-500/20 bg-warning-500/10'}`}
        >
          <span className="text-2xl">
            {analysis.saleScenario.recommendation === 'keep' ? '✅' : '🤔'}
          </span>
          <div>
            <p
              className={`text-sm font-bold ${analysis.saleScenario.recommendation === 'keep' ? 'text-primary-400' : 'text-warning-400'}`}
            >
              {analysis.saleScenario.recommendation === 'keep'
                ? 'Strong Performer: Worth Keeping'
                : 'Lower Yield: Consider Selling/Leveraging'}
            </p>
            <p className="mt-0.5 text-xs text-white/60">
              {analysis.saleScenario.recommendation === 'keep'
                ? `This property is outperforming the stock market by ${analysis.saleScenario.difference > 0 ? formatCurrency(analysis.saleScenario.difference, analysis.currency) : '$0'} annually.`
                : 'Your money might work harder in other investments or by leveraging this equity into more units.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
