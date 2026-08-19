export interface NegotiationRules {
  minimumPrice: number;
  targetPrice: number;
  walkawayPrice: number;
  discountStepPercent: number;
  maxDiscountRounds: number;
  autoNegotiateEnabled: boolean;
  bulkMinQuantity?: number;
  bulkDiscountPercent?: number;
  requestedQuantity?: number;
}

export interface NegotiationResult {
  accepted: boolean;
  agreedPrice?: number;
  counterOffer?: number;
  status: 'agreed' | 'countered' | 'rejected' | 'escalated';
  message: string;
}

export class NegotiationEngine {
  public static processOffer(
    offeredPrice: number,
    currentRound: number,
    rules: NegotiationRules
  ): NegotiationResult {
    if (!rules.autoNegotiateEnabled) {
      return {
        accepted: false,
        status: 'escalated',
        message: 'Auto-negotiation is turned off for this item. Escalating to the seller.',
      };
    }

    const requestedQty = rules.requestedQuantity || 1;
    const bulkMinQty = rules.bulkMinQuantity || 0;
    const bulkDiscountPct = rules.bulkDiscountPercent || 0;

    // Calculate effective minimum floor considering bulk order criteria
    let effectiveMinPrice = rules.minimumPrice;
    let effectiveWalkawayPrice = rules.walkawayPrice;

    if (bulkMinQty > 0 && bulkDiscountPct > 0) {
      if (requestedQty < bulkMinQty) {
        // Buyer is asking for bulk/discount prices without meeting the bulk minimum quantity
        if (offeredPrice < rules.minimumPrice) {
          return {
            accepted: false,
            counterOffer: rules.targetPrice,
            status: 'countered',
            message: `Bulk discount rates require a minimum order of ${bulkMinQty} units. For ${requestedQty} unit(s), the current best price is ${rules.targetPrice}.`,
          };
        }
      } else {
        // Quantity meets or exceeds bulk minimum threshold -> apply bulk discount floor
        const bulkDiscountFactor = 1 - (bulkDiscountPct / 100);
        effectiveMinPrice = Math.max(rules.walkawayPrice, rules.minimumPrice * bulkDiscountFactor);
      }
    }

    // 1. Offer meets or exceeds target price
    if (offeredPrice >= rules.targetPrice) {
      return {
        accepted: true,
        agreedPrice: offeredPrice,
        status: 'agreed',
        message: 'Offer accepted! The offered price meets the target price.',
      };
    }

    // 2. Offer is below the effective walkaway or minimum threshold
    if (offeredPrice < effectiveWalkawayPrice) {
      const step = (rules.targetPrice - effectiveMinPrice) * (rules.discountStepPercent / 100);
      const calculatedCounter = Math.max(effectiveMinPrice, rules.targetPrice - (currentRound * step));

      if (currentRound >= rules.maxDiscountRounds) {
        return {
          accepted: false,
          counterOffer: Number(effectiveMinPrice.toFixed(2)),
          status: 'rejected',
          message: `The offer is below our acceptable range. The best final price per unit is ${effectiveMinPrice.toFixed(2)}.`,
        };
      }

      return {
        accepted: false,
        counterOffer: Number(calculatedCounter.toFixed(2)),
        status: 'countered',
        message: `The offer is a bit too low. The counter-offer is ${calculatedCounter.toFixed(2)}.`,
      };
    }

    // 3. Offer is between effective minimum and target price
    if (offeredPrice >= effectiveMinPrice) {
      return {
        accepted: true,
        agreedPrice: offeredPrice,
        counterOffer: offeredPrice,
        status: 'agreed',
        message: 'Offer accepted! The proposed amount falls within the acceptable price range.',
      };
    }

    // 4. Offer falls between walkaway and minimum price (Step calculation)
    const step = (rules.targetPrice - effectiveMinPrice) * (rules.discountStepPercent / 100);
    const dynamicCounter = Math.max(effectiveMinPrice, rules.targetPrice - (currentRound * step));

    return {
      accepted: false,
      counterOffer: Number(dynamicCounter.toFixed(2)),
      status: 'countered',
      message: `Counter-offer calculated at ${dynamicCounter.toFixed(2)}.`,
    };
  }
}