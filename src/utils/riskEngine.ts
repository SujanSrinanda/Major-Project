import { RiskEvaluationRequest, RiskEvaluationResponse, RiskDecision, RiskLevel, TechnicalRiskDetails, ModelWeights } from '../types';

export const DEFAULT_MODEL_WEIGHTS: ModelWeights = {
  rfWeight: 0.45,
  isoWeight: 0.35,
  graphWeight: 0.20,
};

export async function evaluateTransactionRisk(
  req: RiskEvaluationRequest,
  weights: ModelWeights = DEFAULT_MODEL_WEIGHTS
): Promise<RiskEvaluationResponse> {
  const response = await fetch('/api/evaluate-transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...req, modelWeights: weights }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || `Risk evaluation unavailable (HTTP ${response.status})`);
  }

  const data = await response.json();
  return data as RiskEvaluationResponse;
}

/**
 * Deterministic local risk calculator for standalone UI sandbox/testing components.
 * Note: Real payment flows MUST use server-authoritative evaluateTransactionRisk().
 */
export function calculateLocalRisk(
  req: RiskEvaluationRequest,
  weights: ModelWeights = DEFAULT_MODEL_WEIGHTS
): RiskEvaluationResponse {
  const { amount, isNewRecipient, recipientName } = req;

  // Rule 1: High risk trigger (Amount >= 50,000 or suspicious recipient keywords)
  const isSuspiciousRecipient = /unknown|scam|crypto|lottery|unverified|urgent/i.test(recipientName);

  if (amount >= 50000 || (amount >= 20000 && isNewRecipient) || isSuspiciousRecipient) {
    const decision: RiskDecision = 'BLOCK';
    const riskLevel: RiskLevel = 'CRITICAL';
    const safetyScore = Math.max(15, Math.floor(40 - (amount / 2000)));

    const humanReasons: string[] = [];
    if (amount >= 20000) humanReasons.push(`This payment of ₹${amount.toLocaleString('en-IN')} is much larger than your usual payments.`);
    if (isNewRecipient) humanReasons.push('This recipient is brand new and has not been verified in your past transactions.');
    humanReasons.push('Our security model detected unusual activity signals associated with this transaction.');
    humanReasons.push('The payment device or network context presented elevated threat characteristics.');

    const technicalDetails: TechnicalRiskDetails = {
      rfScore: 0.89,
      ifScore: 0.84,
      graphRisk: 0.78,
      shapFactors: [
        { factor: 'Transaction Amount vs Historical Baseline', impact: '+0.38', weight: 0.38 },
        { factor: 'New Unverified Recipient Node', impact: '+0.29', weight: 0.29 },
        { factor: 'Neo4j Graph High-Risk Distance', impact: '+0.18', weight: 0.18 },
        { factor: 'Isolation Forest Anomaly Deviation', impact: '+0.14', weight: 0.14 },
      ],
      riskFusionModel: 'Ensembled Random Forest + Isolation Forest + Neo4j Graph Fusion',
      anomaliesDetected: [
        'Out-of-distribution transfer magnitude',
        'Unrecognized destination vertex in knowledge graph',
        'Short account lifespan multiplier',
      ],
    };

    return {
      decision,
      safetyScore,
      riskLevel,
      userMessage: 'SentinelFin stopped this payment to protect your money.',
      humanReasons,
      technicalDetails,
    };
  }

  // Rule 2: Challenge trigger (Amount between 10,000 and 50,000 or new recipient)
  if (amount >= 10000 || isNewRecipient) {
    const decision: RiskDecision = 'CHALLENGE';
    const riskLevel: RiskLevel = 'MEDIUM';
    const safetyScore = 72; // Deterministic static score

    const humanReasons: string[] = [
      `This payment of ₹${amount.toLocaleString('en-IN')} is slightly higher than your daily average.`,
      isNewRecipient
        ? 'You are paying a new recipient for the first time.'
        : 'The transaction time or location differs slightly from your routine.',
      'We need a quick security confirmation before processing.',
    ];

    const technicalDetails: TechnicalRiskDetails = {
      rfScore: 0.42,
      ifScore: 0.51,
      graphRisk: 0.35,
      shapFactors: [
        { factor: 'Transaction Amount Deviation', impact: '+0.21', weight: 0.21 },
        { factor: 'New Recipient Flag', impact: '+0.18', weight: 0.18 },
        { factor: 'Device Consistency', impact: '-0.12', weight: -0.12 },
      ],
      riskFusionModel: 'SentinelFin Multi-Factor Risk Fusion',
      anomaliesDetected: ['Moderate amount variance from 30-day baseline'],
    };

    return {
      decision,
      safetyScore,
      riskLevel,
      userMessage: 'We need to verify this payment before proceeding.',
      humanReasons,
      technicalDetails,
    };
  }

  // Rule 3: Allow (Safe transaction)
  const decision: RiskDecision = 'ALLOW';
  const riskLevel: RiskLevel = 'LOW';
  const safetyScore = 95; // Deterministic static score

  const humanReasons: string[] = [
    'Normal payment amount compared with your usual activity.',
    'Recipient is recognized or verified in your account.',
    'Transaction made from your trusted device and location.',
    'No suspicious security signals detected.',
  ];

  const technicalDetails: TechnicalRiskDetails = {
    rfScore: 0.04,
    ifScore: 0.08,
    graphRisk: 0.02,
    shapFactors: [
      { factor: 'Recognized Recipient History', impact: '-0.35', weight: -0.35 },
      { factor: 'Trusted Device Footprint', impact: '-0.28', weight: -0.28 },
      { factor: 'Normal Spend Envelope', impact: '-0.22', weight: -0.22 },
    ],
    riskFusionModel: 'SentinelFin Baseline Protection',
    anomaliesDetected: [],
  };

  return {
    decision,
    safetyScore,
    riskLevel,
    userMessage: 'Looks safe to pay.',
    humanReasons,
    technicalDetails,
  };
}
