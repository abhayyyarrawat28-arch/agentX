import { z } from 'zod';

const ProductTypeEnum = z.enum(['Term Plan', 'Savings Plan', 'ULIP', 'Endowment']);
const PersistencyField = z.number().min(0).max(1).default(0.8);

export const ForwardCalcSchema = z.object({
  policiesSold: z.number().int().min(1),
  averageAnnualPremium: z.number().positive(),
  productType: ProductTypeEnum,
  persistencyRate: PersistencyField,
  bonusSlabId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
});

export const ForwardCalcBulkSchema = z.object({
  mode: z.literal('bulk'),
  policies: z.array(z.object({
    productType: ProductTypeEnum,
    annualPremium: z.number().positive(),
    persistencyRate: PersistencyField,
  })).min(1).max(50),
  bonusSlabId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
});

export const ReverseCalcSchema = z.object({
  targetIncome: z.number().positive(),
  incomePeriod: z.enum(['monthly', 'quarterly']),
  productType: ProductTypeEnum.optional(),
  bonusSlabId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  conversionRate: z.number().min(0.01).max(1).optional(),
});

export const SimulationModuleSchema = z.object({
  policiesSold: z.number().int().min(1),
  averageAnnualPremium: z.number().positive(),
  productType: ProductTypeEnum,
  selectedConditionKey: z.string().min(2).max(50).trim(),
});

export const SimulationModuleBulkSchema = z.object({
  mode: z.literal('bulk'),
  policies: z.array(z.object({
    productType: ProductTypeEnum,
    annualPremium: z.number().positive(),
  })).min(1).max(50),
  selectedConditionKey: z.string().min(2).max(50).trim(),
});

export const MDRTTrackerSchema = z.object({
  manualOverridePremium: z.number().min(0).optional(),
});

export const ActivityPredictorSchema = z.object({
  meetingsPerWeek: z.number().int().min(1),
  conversionRate: z.number().min(0.01).max(1),
  averagePremiumPerSale: z.number().positive(),
  productType: ProductTypeEnum,
});
