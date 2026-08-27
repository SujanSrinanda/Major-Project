import { TransactionCategory } from '../services/spendingService';

export type { TransactionCategory };

export type RiskDecision = 'ALLOW' | 'CHALLENGE' | 'BLOCK';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ModelWeights {
  rfWeight: number;    // Random Forest Weight (0.0 - 1.0)
  isoWeight: number;   // Isolation Forest Weight (0.0 - 1.0)
  graphWeight: number; // Neo4j Graph Neural Weight (0.0 - 1.0)
}

export interface TechnicalRiskDetails {
  rfScore: number;          // Random Forest Probability (0.0 - 1.0)
  ifScore: number;          // Isolation Forest Anomaly Score (0.0 - 1.0)
  graphRisk: number;        // Neo4j Knowledge Graph Connectivity Risk (0.0 - 1.0)
  shapFactors: {            // SHAP Feature Importance Contributions
    factor: string;
    impact: string;
    weight: number;
  }[];
  riskFusionModel: string;  // e.g. "Gradient Ensembled Risk Fusion v2.4"
  anomaliesDetected: string[];
}

export interface RecurringPatternFlag {
  isHighRisk: boolean;
  patternType: 'RAPID_BURST' | 'SPLIT_STRUCTURING' | 'VELOCITY_SPIKE' | 'RECURRING_ANOMALY';
  label: string;
  reason: string;
  severity: 'HIGH' | 'CRITICAL';
  detectedAt: string;
  countInWindow?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  recipientName: string;
  recipientPhone: string;
  amount: number;
  note?: string;
  category?: TransactionCategory;
  type: 'PHONE' | 'CONTACT' | 'QR' | 'MANUAL' | 'BANK';
  status: 'PENDING' | 'COMPLETED' | 'CHALLENGED' | 'BLOCKED' | 'FLAGGED';
  decision: RiskDecision;
  safetyScore: number;      // 0 - 100
  riskLevel: RiskLevel;
  reasons: string[];        // Human readable reasons (e.g., "Normal amount", "Recognized device")
  technicalDetails?: TechnicalRiskDetails;
  timestamp: string;
  isNewRecipient?: boolean;
  highRiskPatternFlag?: RecurringPatternFlag;
}

export interface Contact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  isFavorite: boolean;
  isNew: boolean;
  avatar?: string;
  email?: string;
}

export interface SecurityAlert {
  id: string;
  userId: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  isRead: boolean;
  relatedTransactionId?: string;
  actionTaken?: string;
}

export interface TrustedDevice {
  id: string;
  userId: string;
  name: string;
  browser: string;
  isCurrent: boolean;
  isTrusted: boolean;
  lastActive: string;
  location?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  balance?: number;
  safetyScore?: number;
  protectionLevel: 'Balanced' | 'High Protection' | 'Strict';
  notificationsEnabled: boolean;
  createdAt: string;
}

export interface RiskEvaluationRequest {
  recipientName: string;
  recipientPhone: string;
  amount: number;
  paymentType: 'PHONE' | 'CONTACT' | 'QR' | 'MANUAL' | 'BANK';
  note?: string;
  category?: TransactionCategory;
  isNewRecipient?: boolean;
}

export interface RiskEvaluationResponse {
  decision: RiskDecision;
  safetyScore: number;
  riskLevel: RiskLevel;
  userMessage: string;
  humanReasons: string[];
  technicalDetails: TechnicalRiskDetails;
}
