// ==========================================
// FILE: backend/src/ai/tools/negotiationTools.ts
// ==========================================

import { ToolDefinition, SecurityContext, ToolExecutionResult, RiskLevel } from './types';
import { NegotiationEngine, NegotiationRules } from '../../services/negotiationEngine';

const executeNegotiationOffer = async (params: any, _securityContext?: SecurityContext): Promise<ToolExecutionResult> => {
  try {
    const listPrice = Number(params.listPrice);
    const minPrice = Number(params.minPrice);
    const offerAmount = Number(params.offerAmount);
    const currentRound = Number(params.currentRound || 1);

    const rules: NegotiationRules = {
      minimumPrice: minPrice,
      targetPrice: listPrice,
      walkawayPrice: minPrice,
      discountStepPercent: params.discountStepPercent || 5,
      maxDiscountRounds: params.maxDiscountRounds || 3,
      autoNegotiateEnabled: true,
      bulkMinQuantity: 0,
      bulkDiscountPercent: 0,
      requestedQuantity: 1,
    };

    const result = NegotiationEngine.processOffer(offerAmount, currentRound, rules);

    return {
      success: true,
      data: result,
      riskLevel: 'low' as RiskLevel,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to process negotiation offer',
      riskLevel: 'low' as RiskLevel,
    };
  }
};

export const processOfferTool: ToolDefinition = {
  name: 'process_negotiation_offer',
  description: 'Evaluates a buyer\'s numerical price offer against seller rules and computes counter-offers or accept/reject status.',
  riskLevel: 'low' as RiskLevel,
  allowedRoles: ['GUEST', 'ADMIN', 'SELLER'] as any,
  parameters: {
    type: 'object',
    properties: {
      offerAmount: {
        type: 'number',
        description: 'The buyer\'s proposed offer price.',
      },
      currentRound: {
        type: 'number',
        description: 'The active round sequence of the negotiation (starts at 1).',
      },
      listPrice: {
        type: 'number',
        description: 'The original listing price of the item.',
      },
      minPrice: {
        type: 'number',
        description: 'The absolute floor price allowed for the item.',
      },
      discountStepPercent: {
        type: 'number',
        description: 'Percentage discount reduction per round (default 5).',
      },
      maxDiscountRounds: {
        type: 'number',
        description: 'Maximum allowable rounds for bargaining (default 3).',
      },
    },
    required: ['offerAmount', 'listPrice', 'minPrice'],
  },
  handler: executeNegotiationOffer,
  execute: executeNegotiationOffer,
};

export const negotiationTools: ToolDefinition[] = [
  processOfferTool,
];