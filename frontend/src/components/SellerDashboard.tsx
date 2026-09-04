// ==========================================
// FILE: src/components/SellerDashboard.tsx
// ==========================================

import React, { useState } from 'react';
import { StrategyDrawer, type ProductStrategy } from './StrategyDrawer';

interface NegotiationSession {
  id: string;
  productId: string;
  productName: string;
  buyerHandle: string;
  channel: 'WhatsApp' | 'Web Chat';
  listPrice: number;
  floorPrice: number;
  currentOffer: number;
  rounds: number;
  status: 'ACTIVE' | 'ACCEPTED' | 'DECLINED' | 'STALLED';
  lastUpdated: string;
}

const MOCK_SESSIONS: NegotiationSession[] = [
  {
    id: 'SESS-8921',
    productId: 'PROD-101',
    productName: 'Sony WH-1000XM5 Headphones',
    buyerHandle: '+234 812 *** 8821',
    channel: 'WhatsApp',
    listPrice: 350,
    floorPrice: 280,
    currentOffer: 310,
    rounds: 3,
    status: 'ACTIVE',
    lastUpdated: '2 mins ago',
  },
  {
    id: 'SESS-8922',
    productId: 'PROD-102',
    productName: 'MacBook Air M2 13"',
    buyerHandle: 'alex_buyer_99',
    channel: 'Web Chat',
    listPrice: 999,
    floorPrice: 880,
    currentOffer: 920,
    rounds: 4,
    status: 'ACCEPTED',
    lastUpdated: '15 mins ago',
  },
  {
    id: 'SESS-8923',
    productId: 'PROD-103',
    productName: 'Dell XPS 15 OLED',
    buyerHandle: '+234 903 *** 1102',
    channel: 'WhatsApp',
    listPrice: 1450,
    floorPrice: 1250,
    currentOffer: 1100,
    rounds: 2,
    status: 'DECLINED',
    lastUpdated: '1 hour ago',
  },
  {
    id: 'SESS-8924',
    productId: 'PROD-104',
    productName: 'Keychron Q1 Pro Wireless',
    buyerHandle: 'tech_enthusiast',
    channel: 'Web Chat',
    listPrice: 190,
    floorPrice: 160,
    currentOffer: 175,
    rounds: 2,
    status: 'ACTIVE',
    lastUpdated: 'Just now',
  },
];

export const SellerDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<NegotiationSession[]>(MOCK_SESSIONS);
  const [filter, setFilter] = useState<string>('ALL');

  // Strategy Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [selectedStrategy, setSelectedStrategy] = useState<ProductStrategy | undefined>(undefined);

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'ALL') return true;
    return s.status === filter;
  });

  const handleOpenStrategy = (session?: NegotiationSession) => {
    if (session) {
      setSelectedStrategy({
        productId: session.productId,
        productName: session.productName,
        listPrice: session.listPrice,
        floorPrice: session.floorPrice,
        targetMargin: 20,
        aiPersona: 'BALANCED',
        maxRounds: 5,
        autoAcceptThreshold: Math.round(session.listPrice * 0.95),
      });
    } else {
      // Default to first session if opened from header button
      const first = sessions[0];
      setSelectedStrategy({
        productId: first.productId,
        productName: first.productName,
        listPrice: first.listPrice,
        floorPrice: first.floorPrice,
        targetMargin: 20,
        aiPersona: 'BALANCED',
        maxRounds: 5,
        autoAcceptThreshold: Math.round(first.listPrice * 0.95),
      });
    }
    setIsDrawerOpen(true);
  };

  const handleSaveStrategy = (updated: ProductStrategy) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.productId === updated.productId ? { ...s, floorPrice: updated.floorPrice } : s
      )
    );
  };

  const getStatusBadge = (status: NegotiationSession['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">Active</span>;
      case 'ACCEPTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">Accepted</span>;
      case 'DECLINED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Declined</span>;
      case 'STALLED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Stalled</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            TRADARA <span className="text-indigo-500">Seller Analytics</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time AI negotiation performance and autonomous deal insights.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition">
            Export CSV
          </button>
          <button
            onClick={() => handleOpenStrategy()}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-600/30 transition"
          >
            Adjust Strategy
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Deal Volume</p>
          <h3 className="text-2xl font-bold text-white mt-2">$24,850</h3>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            ↑ +18.4% <span className="text-slate-500 font-normal">vs last month</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">AI Conversion Rate</p>
          <h3 className="text-2xl font-bold text-white mt-2">68.2%</h3>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            ↑ +4.1% <span className="text-slate-500 font-normal">deal close rate</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Avg Margin Protection</p>
          <h3 className="text-2xl font-bold text-white mt-2">14.8%</h3>
          <p className="text-xs text-slate-400 mt-1 font-normal">Above configured floor price</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Conversations</p>
          <h3 className="text-2xl font-bold text-indigo-400 mt-2">12 Sessions</h3>
          <p className="text-xs text-slate-400 mt-1 font-normal">WhatsApp & Web Chat active</p>
        </div>
      </div>

      {/* Negotiation Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {/* Table Header & Controls */}
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Live Negotiation Sessions</h2>
          <div className="flex items-center gap-2">
            {['ALL', 'ACTIVE', 'ACCEPTED', 'DECLINED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  filter === st
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Session ID / Item</th>
                <th className="px-6 py-4">Buyer & Channel</th>
                <th className="px-6 py-4">List / Floor</th>
                <th className="px-6 py-4">Current Offer</th>
                <th className="px-6 py-4">Rounds</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-white">{session.productName}</p>
                    <p className="text-xs text-slate-500">{session.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-200">{session.buyerHandle}</p>
                    <span className="text-xs text-indigo-400 font-medium">{session.channel}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-200">${session.listPrice}</p>
                    <p className="text-xs text-slate-500">Floor: ${session.floorPrice}</p>
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-400">
                    ${session.currentOffer}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-300">
                    {session.rounds} / 5
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(session.status)}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenStrategy(session)}
                      className="px-3 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                    >
                      Config AI
                    </button>
                    {session.status === 'ACTIVE' && (
                      <button className="px-3 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow transition">
                        Takeover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategy Drawer Modal */}
      <StrategyDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialStrategy={selectedStrategy}
        onSave={handleSaveStrategy}
      />
    </div>
  );
};

export default SellerDashboard;