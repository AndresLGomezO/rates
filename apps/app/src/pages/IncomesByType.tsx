import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { Income, IncomeType } from '@rates/firebase-client';
import { getUserIncomes } from '../services/incomes';
import { IncomeCard } from '../components/IncomeCard';
import { NewIncomeWizard } from '../components/NewIncomeWizard';

const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  salary: 'Salary & Wages',
  freelance: 'Freelance & Gig',
  rental: 'Rental Income',
  investments: 'Investments',
  benefits: 'Benefits',
  other: 'Other',
};

export default function IncomesByType() {
  const { type } = useParams<{ type: IncomeType }>();
  const [incomes, setIncomes] = useState<(Income & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadIncomes = useCallback(async () => {
    try {
      setLoading(true);
      const allIncomes = await getUserIncomes();
      if (type) {
        setIncomes(allIncomes.filter((inc) => inc.type === type));
      } else {
        setIncomes(allIncomes);
      }
    } catch (err) {
      console.error('Error loading incomes:', err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void loadIncomes();
  }, [loadIncomes]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center text-white/80">
        <div className="mb-4 h-[50px] w-[50px] animate-spin rounded-full border-4 border-neutral-600/30 border-t-primary-500"></div>
        <p>Loading incomes...</p>
      </div>
    );
  }

  return (
    <div className="m-0 box-border flex max-h-full w-full animate-fadeIn-slow flex-col gap-6 overflow-x-hidden p-4">
      <div className="relative mb-6 flex items-center justify-between pb-6 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:content-['']">
        <h2 className="m-0 bg-gradient-to-br from-white to-white/80 bg-clip-text text-xl font-bold -tracking-[0.5px] text-transparent text-white drop-shadow-[0_2px_20px_rgba(255,255,255,0.1)] md:text-4xl">
          {type ? INCOME_TYPE_LABELS[type] : 'All Incomes'}
        </h2>
        <button
          className="ds-button-gradient flex items-center gap-2 px-6 py-3.5 text-[0.95rem]"
          onClick={() => setIsModalOpen(true)}
        >
          <span className="text-xl font-bold leading-none">+</span>
          <span>Add New</span>
        </button>
      </div>

      <NewIncomeWizard
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => {
          setIsModalOpen(false);
          void loadIncomes();
        }}
      />

      {incomes.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl">
          <p className="mb-6 text-xl text-white/60">
            No {type ? INCOME_TYPE_LABELS[type].toLowerCase() : 'incomes'}{' '}
            found.
          </p>
          <button
            className="ds-button-gradient mx-auto flex items-center gap-2 px-8 py-4 text-base"
            onClick={() => setIsModalOpen(true)}
          >
            <span className="text-xl font-bold leading-none">+</span>
            <span>Add Your First Income</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {incomes.map((income) => (
            <IncomeCard key={income.id} income={income} />
          ))}
        </div>
      )}
    </div>
  );
}
