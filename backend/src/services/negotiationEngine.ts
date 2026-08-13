export interface NegotiationRules {
  minimumPrice: number;
  targetPrice: number;
  walkawayPrice: number;
  discountStepPercent: number;
  maxDiscountRounds: number;
  autoNegotiateEnabled: boolean;
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

    // 1. Offer meets or exceeds the target/list price
    if (offeredPrice >= rules.targetPrice) {
      return {
        accepted: true,
        agreedPrice: offeredPrice,
        status: 'agreed',
        message: 'Offer accepted! The offered price meets the target price.',
      };
    }

    // 2. Offer is below the absolute walkaway/minimum threshold
    if (offeredPrice < rules.walkawayPrice) {
      // Calculate a conservative counter-offer
      const step = (rules.targetPrice - rules.minimumPrice) * (rules.discountStepPercent / 100);
      const calculatedCounter = Math.max(rules.minimumPrice, rules.targetPrice - (currentRound * step));

      if (currentRound >= rules.maxDiscountRounds) {
        return {
          accepted: false,
          counterOffer: rules.minimumPrice,
          status: 'rejected',
          message: `The offer is below our acceptable range. The best final price is ${rules.minimumPrice}.`,
        };
      }

      return {
        accepted: false,
        counterOffer: Number(calculatedCounter.toFixed(2)),
        status: 'countered',
        message: `The offer is a bit too low. The counter-offer is ${calculatedCounter.toFixed(2)}.`,
      };
    }

    // 3. Offer is between walkawayPrice and targetPrice
    if (offeredPrice >= rules.minimumPrice) {
      return {
        accepted: true,
        agreedPrice: offeredPrice,
        counterOffer: offeredPrice,
        status: 'agreed',
        message: 'Offer accepted! The proposed amount falls within the acceptable price range.',
      };
    }

    // 4. Offer is between walkawayPrice and minimumPrice (Step reduction logic)
    const step = (rules.targetPrice - rules.minimumPrice) * (rules.discountStepPercent / 100);
    const dynamicCounter = Math.max(rules.minimumPrice, rules.targetPrice - (currentRound * step));

    return {
      accepted: false,
      counterOffer: Number(dynamicCounter.toFixed(2)),
      status: 'countered',
      message: `Counter-offer calculated at ${dynamicCounter.toFixed(2)}.`,
    };
  }
}