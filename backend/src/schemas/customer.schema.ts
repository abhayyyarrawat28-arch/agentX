import { z } from 'zod';

export const CreatePolicyHolderSchema = z.object({
  firstName: z.string().min(2).max(50).trim(),
  lastName: z.string().min(1).max(50).trim(),
  dateOfBirth: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid date' })
    .refine(val => new Date(val) < new Date(), { message: 'Date of birth must be in the past' })
    .refine(val => {
      const age = new Date().getFullYear() - new Date(val).getFullYear();
      return age >= 18 && age <= 99;
    }, { message: 'Age must be between 18 and 99' }),
  gender: z.enum(['male', 'female', 'other']),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).transform(v => v.toUpperCase()),
  aadhaarLast4: z.string().regex(/^\d{4}$/),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().email().toLowerCase().optional().nullable(),
  address: z.object({
    street: z.string().min(3).max(200),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    pincode: z.string().regex(/^\d{6}$/),
  }),
  relationToProposer: z.enum(['self', 'spouse', 'child', 'parent', 'other']).default('self'),
  isPriorityCustomer: z.boolean().optional().default(false),
  fixedMonthlyReturn: z.boolean().optional().default(false),
  monthlyRenewalAmount: z.number().min(0).optional().nullable(),
});

export const UpdatePolicyHolderSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/).optional(),
  email: z.string().email().toLowerCase().optional().nullable(),
  address: z.object({
    street: z.string().min(3).max(200),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    pincode: z.string().regex(/^\d{6}$/),
  }).optional(),
  relationToProposer: z.enum(['self', 'spouse', 'child', 'parent', 'other']).optional(),
  isPriorityCustomer: z.boolean().optional(),
  fixedMonthlyReturn: z.boolean().optional(),
  monthlyRenewalAmount: z.number().min(0).optional().nullable(),
});

export const CustomerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['firstName', 'totalAnnualPremium', 'totalActivePolicies', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
