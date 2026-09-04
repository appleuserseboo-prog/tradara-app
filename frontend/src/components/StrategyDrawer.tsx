// ==========================================
// FILE: src/components/StrategyDrawer.tsx
// ==========================================

import React, { useState } from 'react';

export interface ProductStrategy {
  productId: string;
  productName: string;
  listPrice: number;
  floorPrice: number;
  targetMargin: number; // percentage
  aiPersona: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
  maxRounds: number;
  autoAcceptThreshold: number;
}

interface StrategyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialStrategy?: ProductStrategy;
  onSave: (updatedStrategy: ProductStrategy) => void;
}

export const StrategyDrawer: React.FC<StrategyDrawerProps> = ({
  isOpen,
  onClose,
  initialStrategy = {
    productId: 'PROD-101',
    productName: 'Sony WH-1000XM5 Headphones',
    listPrice: 350,
    floorPrice: 280,
    targetMargin: 20,
    aiPersona: 'BALANCED',
    maxRounds: 5,
    autoAcceptThreshold: 330,
  },
  onSave,
}) => {
  const [strategy, setStrategy] = useState<ProductStrategy>(initialStrategy);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(strategy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white">AI Strategy Rules</h2>
              <p className="text-xs text-slate-400 mt-0.5">{strategy.productName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 border border-slate-700 text-sm"
            >
              ✕
            </button>
          </div>

          {/* Form Controls */}
          <form id="strategy-form" onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* List Price Reference */}
            <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 flex justify-between items-center">
              <span className="text-xs font-medium text-slate-400">List Price</span>
              <span className="text-base font-bold text-indigo-400">${strategy.listPrice}</span>
            </div>

            {/* Floor Price Slider */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <label className="font-semibold text-slate-200">Floor Price (Minimum Limit)</label>
                <span className="font-bold text-emerald-400">${strategy.floorPrice}</span>
              </div>
              <input
                type="range"
                min={Math.round(strategy.listPrice * 0.5)}
                max={strategy.listPrice}
                step={5}
                value={strategy.floorPrice}
                onChange={(e) =>
                  setStrategy({ ...strategy, floorPrice: Number(e.target.value) })
                }
                className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-1">
                The AI will never offer or accept prices below this boundary.
              </p>
            </div>

            {/* Auto-Accept Threshold */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <label className="font-semibold text-slate-200">Instant Deal Threshold</label>
                <span className="font-bold text-blue-400">${strategy.autoAcceptThreshold}</span>
              </div>
              <input
                type="range"
                min={strategy.floorPrice}
                max={strategy.listPrice}
                step={5}
                value={strategy.autoAcceptThreshold}
                onChange={(e) =>
                  setStrategy({ ...strategy, autoAcceptThreshold: Number(e.target.value) })
                }
                className="w-full accent-blue-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-1">
                Any offer at or above this amount gets accepted instantly.
              </p>
            </div>

            {/* AI Negotiation Persona */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                AI Negotiation Persona
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'] as const).map((persona) => (
                  <button
                    key={persona}
                    type="button"
                    onClick={() => setStrategy({ ...strategy, aiPersona: persona })}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition text-center ${
                      strategy.aiPersona === persona
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {persona}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {strategy.aiPersona === 'CONSERVATIVE' && 'Protects margins strictly with small step discounts.'}
                {strategy.aiPersona === 'BALANCED' && 'Standard balance between deal volume and profit margin.'}
                {strategy.aiPersona === 'AGGRESSIVE' && 'Prioritizes rapid liquidation with flexible counter-offers.'}
              </p>
            </div>

            {/* Max Counter Rounds */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Max Automated Rounds
              </label>
              <select
                value={strategy.maxRounds}
                onChange={(e) => setStrategy({ ...strategy, maxRounds: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {[3, 5, 7, 10].map((num) => (
                  <option key={num} value={num}>
                    {num} Rounds (Escalate to Seller on reaching limit)
                  </option>
                ))}
              </select>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="strategy-form"
            className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-600/30 transition"
          >
            Save Rules
          </button>
        </div>
      </div>
    </div>
  );
};

export default StrategyDrawer;