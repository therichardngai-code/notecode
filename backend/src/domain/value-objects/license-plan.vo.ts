/**
 * License Plan Value Object
 * 2-tier: Free (unlimited core) / Pro (one-time, lifetime)
 *
 * Free: All core features unlimited
 * Pro: Internal Hooks + Memory System + future Pro features
 */

export type PlanType = 'free' | 'pro';

/** Pro-only features. Everything NOT listed here is free unlimited. */
export type ProFeature =
  | 'internal-hooks'    // Internal App Hooks system
  | 'memory-system';    // Agent memory extraction + injection
  // Future Pro features added here — existing Pro users auto-get them

/** Pro feature list — single source of truth */
export const PRO_FEATURES: ProFeature[] = [
  'internal-hooks',
  'memory-system',
];

/** Check if a feature requires Pro plan */
export function isProFeature(feature: string): boolean {
  return PRO_FEATURES.includes(feature as ProFeature);
}

/** Check if a plan can access a given feature */
export function canAccess(plan: PlanType, feature: string): boolean {
  if (!isProFeature(feature)) return true; // Free features → always allowed
  return plan === 'pro';                    // Pro features → only Pro plan
}

/** Get plan display info */
export function getPlanDisplayInfo(plan: PlanType): { name: string; description: string } {
  const info: Record<PlanType, { name: string; description: string }> = {
    free: { name: 'Free', description: 'All core features, unlimited usage' },
    pro: { name: 'Pro', description: 'Internal Hooks + Memory System + future Pro features' },
  };
  return info[plan];
}
