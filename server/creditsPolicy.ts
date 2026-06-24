export const FREE_TRIAL_CREDITS = 150;

export function calculateCreditDeduction(
  balance: { subscription: number; purchased: number },
  amount: number
): { subscription: number; purchased: number } {
  if (amount < 0) throw new Error("Credit deduction must be non-negative");
  if (balance.subscription + balance.purchased < amount) {
    throw new Error("Insufficient credits");
  }

  const subscriptionUsed = Math.min(balance.subscription, amount);
  const purchasedUsed = amount - subscriptionUsed;

  return {
    subscription: balance.subscription - subscriptionUsed,
    purchased: balance.purchased - purchasedUsed,
  };
}

export function calculateFreeTrialGrant(
  alreadyGranted: boolean,
  currentSubscriptionBalance: number
): { grant: number; balance: number; markGranted: boolean } {
  if (alreadyGranted) {
    return {
      grant: 0,
      balance: currentSubscriptionBalance,
      markGranted: false,
    };
  }

  const balance = Math.max(currentSubscriptionBalance, FREE_TRIAL_CREDITS);
  return {
    grant: balance - currentSubscriptionBalance,
    balance,
    markGranted: true,
  };
}
