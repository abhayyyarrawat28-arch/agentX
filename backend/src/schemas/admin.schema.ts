import { z } from 'zod';

export const CommissionConfigSchema = z.object({
  slabs: z.array(z.object({
    minPremium: z.number().min(0),
    maxPremium: z.number().positive().nullable(),
    bonusRate: z.number().min(0).max(1),
  })).min(1),
  simulationConditions: z.array(z.object({
    key: z.string().min(2).max(50).trim(),
    label: z.string().min(2).max(100).trim(),
    description: z.string().max(300).trim().default(''),
    basePersistency: z.number().min(0).max(1),
    annualBoost: z.number().min(-0.25).max(0.25).default(0),
    premiumSensitivity: z.number().min(-0.25).max(0.25).default(0),
    volumeSensitivity: z.number().min(-0.25).max(0.25).default(0),
    productAdjustments: z.object({
      termPlan: z.number().min(-0.25).max(0.25).default(0),
      savingsPlan: z.number().min(-0.25).max(0.25).default(0),
      ulip: z.number().min(-0.25).max(0.25).default(0),
      endowment: z.number().min(-0.25).max(0.25).default(0),
    }),
  })).min(1),
  persistencyThreshold: z.number().min(0).max(1),
  mdrtTarget: z.number().positive(),
  effectiveFrom: z.string()
    .refine(val => !isNaN(Date.parse(val)), { message: 'Invalid effective date' })
    .refine(val => new Date(val) >= new Date(new Date().toDateString()), {
      message: 'Effective date must be today or in the future',
    }),
}).superRefine((data, ctx) => {
  const sorted = [...data.slabs].sort((a, b) => a.minPremium - b.minPremium);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (a.maxPremium !== null && a.maxPremium > b.minPremium) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Slabs overlap', path: ['slabs'] });
    }
  }
});

export const AgentOverviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  branchId: z.string().optional(),
  mdrtStatus: z.enum(['qualified', 'on-track', 'at-risk']).optional(),
  sortBy: z.enum(['name', 'ytdPremium', 'policyCount', 'persistencyRate']).default('ytdPremium'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(100).optional(),
});

export const CreateUserSchema = z.object({
  employeeId: z.string().min(3).max(20).trim(),
  name: z.string().min(2).max(100).trim(),
  role: z.enum(['agent', 'admin']),
  branchId: z.string().min(1).max(20).trim(),
  password: z.string().min(8).max(50),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  branchId: z.string().min(1).max(20).trim().optional(),
  isActive: z.boolean().optional(),
});

export const LoginSchema = z.object({
  employeeId: z.string().min(1),
  password: z.string().min(1),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(50),
});

export const AdminSignupSchema = z.object({
  employeeId: z.string().min(3).max(20).trim(),
  name: z.string().min(2).max(100).trim(),
  branchId: z.string().min(1).max(20).trim(),
  password: z.string().min(8).max(50),
});

export const AgentRegistrationInputSchema = z.object({
  fullName: z.string().min(2).max(100).trim(),
  dateOfBirth: z.string().refine(v => !isNaN(Date.parse(v)), { message: 'Invalid date' }),
  gender: z.enum(['male', 'female', 'other']),
  employeeId: z.string().min(3).max(20).trim(),
  branchId: z.string().min(1).max(20).trim(),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().email(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/),
  licenseNumber: z.string().min(3).max(30).trim(),
  licenseExpiry: z.string().refine(v => !isNaN(Date.parse(v)), { message: 'Invalid date' })
    .refine(v => new Date(v) > new Date(), { message: 'License must not be expired' }),
  yearsOfExperience: z.number().int().min(0),
});

export const RegistrationApproveSchema = z.object({
  branchId: z.string().optional(),
});

export const RegistrationRejectSchema = z.object({
  rejectionNote: z.string().min(5).max(500),
});

export const LogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const ProductCreateSchema = z.object({
  name: z.enum(['Term Plan', 'Savings Plan', 'ULIP', 'Endowment']),
  fyCommissionRate: z.number().min(0).max(1),
  renewalRates: z.object({
    year2: z.number().min(0).max(1),
    year3: z.number().min(0).max(1),
    year4: z.number().min(0).max(1),
    year5: z.number().min(0).max(1),
  }),
  effectiveFrom: z.string().datetime(),
});

export const ProductUpdateSchema = z.object({
  fyCommissionRate: z.number().min(0).max(1).optional(),
  renewalRates: z.object({
    year2: z.number().min(0).max(1),
    year3: z.number().min(0).max(1),
    year4: z.number().min(0).max(1),
    year5: z.number().min(0).max(1),
  }).optional(),
  isActive: z.boolean().optional(),
});
