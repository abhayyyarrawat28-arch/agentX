import { z } from 'zod';

const ProductTypeEnum = z.enum(['Term Plan', 'Savings Plan', 'ULIP', 'Endowment']);

export const PolicyLineItemSchema = z.object({
  policyHolderId: z.string().regex(/^[a-f\d]{24}$/i),
  productId: z.string().regex(/^[a-f\d]{24}$/i),
  productType: ProductTypeEnum,
  policyNumber: z.string().min(6).max(30).trim(),
  annualPremium: z.number().positive(),
  sumAssured: z.number().positive(),
  policyTerm: z.number().int().min(1).max(40),
  premiumPayingTerm: z.number().int().min(1),
  paymentFrequency: z.enum(['annual', 'semi-annual', 'quarterly', 'monthly']).default('annual'),
  issueDate: z.string().datetime(),
});

export const BulkSalePoliciesSchema = z.object({
  policies: z.array(PolicyLineItemSchema).min(1).max(20),
});

export const PolicyListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'lapsed', 'surrendered']).optional(),
  productType: ProductTypeEnum.optional(),
  policyHolderId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  sortBy: z.enum(['issueDate', 'annualPremium', 'productName']).default('issueDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(100).optional(),
});

export const PolicyStatusUpdateSchema = z.object({
  status: z.enum(['active', 'lapsed', 'surrendered']),
});
