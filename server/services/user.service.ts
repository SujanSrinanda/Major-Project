import { UserAccount } from '../db';
import { userRepository, UserRepository } from '../repositories/user.repository';
import { budgetRepository, BudgetRepository } from '../repositories/budget.repository';

export class UserService {
  constructor(
    private userRepo: UserRepository = userRepository,
    private budgetRepo: BudgetRepository = budgetRepository
  ) {}

  async submitOnboarding(
    user: UserAccount,
    payload: {
      personalInfo?: { fullName?: string; city?: string; profilePhoto?: string };
      financialProfile?: { incomeRange?: string; spendingTarget?: number; savingsGoal?: number; currency?: string };
      budgetSetup?: { monthlyLimit?: number; categories?: Array<{ category: string; limit: number }> };
      securityPreferences?: {
        securityAlertsEnabled?: boolean;
        newDeviceAlerts?: boolean;
        transactionAlerts?: boolean;
        protectionLevel?: 'Balanced' | 'High Protection' | 'Strict';
      };
    }
  ) {
    const userId = user.id;
    const { personalInfo, financialProfile, budgetSetup, securityPreferences } = payload;

    // Update user details
    if (personalInfo) {
      await this.userRepo.update(userId, {
        fullName: personalInfo.fullName || user.fullName,
        city: personalInfo.city || user.city,
        profilePhoto: personalInfo.profilePhoto !== undefined ? personalInfo.profilePhoto : user.profilePhoto,
      });
    }

    // Save Financial Profile
    if (financialProfile) {
      await this.userRepo.setFinancialProfile({
        userId,
        incomeRange: financialProfile.incomeRange || '₹50,000–₹1,00,000',
        spendingTarget: Number(financialProfile.spendingTarget) || 30000,
        savingsGoal: Number(financialProfile.savingsGoal) || 10000,
        currency: financialProfile.currency || 'INR ₹',
      });
    }

    // Save Budget Setup
    if (budgetSetup) {
      const categories = (budgetSetup.categories || []).map((c: any, i: number) => ({
        id: `cat-${userId}-${i}`,
        userId,
        category: c.category || `Category ${i + 1}`,
        limit: Number(c.limit) || 5000,
      }));

      await this.budgetRepo.save({
        userId,
        monthlyLimit: Number(budgetSetup.monthlyLimit) || 45000,
        categories,
      });
    }

    // Save Security Profile
    if (securityPreferences) {
      await this.userRepo.setSecurityProfile({
        userId,
        securityAlertsEnabled: securityPreferences.securityAlertsEnabled ?? true,
        newDeviceAlerts: securityPreferences.newDeviceAlerts ?? true,
        transactionAlerts: securityPreferences.transactionAlerts ?? true,
        protectionLevel: securityPreferences.protectionLevel || 'High Protection',
      });
    }

    // Mark onboarding completed
    await this.userRepo.update(userId, { onboardingCompleted: true });

    const updatedUser = (await this.userRepo.findById(userId))!;
    return {
      status: 200,
      data: {
        success: true,
        message: 'Onboarding completed successfully!',
        user: {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          emailVerified: updatedUser.emailVerified,
          phoneVerified: updatedUser.phoneVerified,
          onboardingCompleted: updatedUser.onboardingCompleted,
          city: updatedUser.city,
          profilePhoto: updatedUser.profilePhoto,
        },
      },
    };
  }

  async getProfile(user: UserAccount) {
    const fin = await this.userRepo.getFinancialProfile(user.id);
    const sec = await this.userRepo.getSecurityProfile(user.id);

    return {
      status: 200,
      data: {
        uid: user.id,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        balance: 50000,
        safetyScore: 94,
        protectionLevel: sec?.protectionLevel || 'High Protection',
        notificationsEnabled: sec?.securityAlertsEnabled ?? true,
        city: user.city || 'Bengaluru',
        profilePhoto: user.profilePhoto || null,
        createdAt: user.createdAt,
        financialProfile: fin || null,
        securityProfile: sec || null,
      },
    };
  }

  async updateProfile(
    user: UserAccount,
    payload: {
      name?: string;
      phone?: string;
      protectionLevel?: 'Balanced' | 'High Protection' | 'Strict';
      notificationsEnabled?: boolean;
      city?: string;
      profilePhoto?: string;
      financialProfile?: {
        incomeRange?: string;
        spendingTarget?: number;
        savingsGoal?: number;
        currency?: string;
      };
      securityProfile?: {
        securityAlertsEnabled?: boolean;
        newDeviceAlerts?: boolean;
        transactionAlerts?: boolean;
        protectionLevel?: 'Balanced' | 'High Protection' | 'Strict';
      };
      incomeRange?: string;
      spendingTarget?: number;
      savingsGoal?: number;
      currency?: string;
      securityAlertsEnabled?: boolean;
      newDeviceAlerts?: boolean;
      transactionAlerts?: boolean;
    }
  ) {
    const userId = user.id;
    const {
      name,
      phone,
      protectionLevel,
      notificationsEnabled,
      city,
      profilePhoto,
      financialProfile,
      securityProfile,
      incomeRange,
      spendingTarget,
      savingsGoal,
      currency,
      securityAlertsEnabled,
      newDeviceAlerts,
      transactionAlerts,
    } = payload;

    await this.userRepo.update(userId, {
      fullName: name || user.fullName,
      phone: phone || user.phone,
      city: city !== undefined ? city : user.city,
      profilePhoto: profilePhoto !== undefined ? profilePhoto : user.profilePhoto,
    });

    // Update financial profile if provided
    const existingFin = (await this.userRepo.getFinancialProfile(userId)) || {
      userId,
      incomeRange: '₹50,000–₹1,00,000',
      spendingTarget: 30000,
      savingsGoal: 10000,
      currency: 'INR ₹',
    };

    const finIncome = financialProfile?.incomeRange || incomeRange;
    const finSpending = financialProfile?.spendingTarget !== undefined ? Number(financialProfile.spendingTarget) : (spendingTarget !== undefined ? Number(spendingTarget) : undefined);
    const finSavings = financialProfile?.savingsGoal !== undefined ? Number(financialProfile.savingsGoal) : (savingsGoal !== undefined ? Number(savingsGoal) : undefined);
    const finCurrency = financialProfile?.currency || currency;

    if (finIncome || finSpending !== undefined || finSavings !== undefined || finCurrency) {
      const updatedFin = {
        userId,
        incomeRange: finIncome || existingFin.incomeRange,
        spendingTarget: finSpending !== undefined ? finSpending : existingFin.spendingTarget,
        savingsGoal: finSavings !== undefined ? finSavings : existingFin.savingsGoal,
        currency: finCurrency || existingFin.currency,
      };
      await this.userRepo.setFinancialProfile(updatedFin);
    }

    // Update security profile
    const existingSec = (await this.userRepo.getSecurityProfile(userId)) || {
      userId,
      securityAlertsEnabled: true,
      newDeviceAlerts: true,
      transactionAlerts: true,
      protectionLevel: 'High Protection',
    };

    const targetProtectionLevel = securityProfile?.protectionLevel || protectionLevel;
    const targetSecurityAlerts = securityProfile?.securityAlertsEnabled ?? securityAlertsEnabled ?? (notificationsEnabled !== undefined ? notificationsEnabled : undefined);
    const targetNewDeviceAlerts = securityProfile?.newDeviceAlerts ?? newDeviceAlerts;
    const targetTransactionAlerts = securityProfile?.transactionAlerts ?? transactionAlerts;

    const updatedSec = {
      userId,
      securityAlertsEnabled: targetSecurityAlerts !== undefined ? targetSecurityAlerts : existingSec.securityAlertsEnabled,
      newDeviceAlerts: targetNewDeviceAlerts !== undefined ? targetNewDeviceAlerts : existingSec.newDeviceAlerts,
      transactionAlerts: targetTransactionAlerts !== undefined ? targetTransactionAlerts : existingSec.transactionAlerts,
      protectionLevel: targetProtectionLevel || existingSec.protectionLevel,
    };

    await this.userRepo.setSecurityProfile(updatedSec);

    const updatedUser = (await this.userRepo.findById(userId))!;
    const finalFin = await this.userRepo.getFinancialProfile(userId);
    const finalSec = await this.userRepo.getSecurityProfile(userId);

    return {
      status: 200,
      data: {
        success: true,
        message: 'Profile updated.',
        profile: {
          uid: updatedUser.id,
          name: updatedUser.fullName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          city: updatedUser.city,
          profilePhoto: updatedUser.profilePhoto,
          protectionLevel: finalSec?.protectionLevel || 'High Protection',
          notificationsEnabled: finalSec?.securityAlertsEnabled ?? true,
          financialProfile: finalFin || null,
          securityProfile: finalSec || null,
        },
      },
    };
  }
}

export const userService = new UserService();
