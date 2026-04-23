# Agent Incentive Calculator & Growth Planner
## Master Implementation Specification — v6.0.0

> **Product:** Agent Incentive Calculator & Growth Planner
> **Organization:** Canara HSBC Life Insurance
> **Stack:** React 18 · TypeScript · Vite · Node.js · Express · MongoDB · Recharts · Zod
> **Version:** 6.0.0 — Added Agent Self-Registration + Admin Approval Workflow

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [Authentication & Roles](#3-authentication--roles)
4. [Agent Self-Registration & Approval Workflow](#4-agent-self-registration--approval-workflow)
5. [Data Models](#5-data-models)
6. [Zod Validation Schemas](#6-zod-validation-schemas)
7. [Backend API Modules](#7-backend-api-modules)
8. [Core Calculation Logic](#8-core-calculation-logic)
9. [Frontend Structure](#9-frontend-structure)
10. [Dashboard & Charts Specification](#10-dashboard--charts-specification)
11. [Calculator Modules UI](#11-calculator-modules-ui)
12. [Policy & Customer Management UI](#12-policy--customer-management-ui)
13. [Admin Panel UI](#13-admin-panel-ui)
14. [API Routes Reference](#14-api-routes-reference)
15. [Edge Cases & Error Handling](#15-edge-cases--error-handling)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Out of Scope — Phase 1](#17-out-of-scope--phase-1)

---

## 1. System Overview

### What Is Being Built

A multi-role SaaS web platform for Canara HSBC Life Insurance agents. Two separate React SPAs share one Node.js + Express REST API.

| App | Audience | Purpose |
|---|---|---|
| **Agent App** | Agents | Calculators, policy & customer management, visual dashboards, MDRT tracker |
| **Admin App** | Admins | Commission config, user management, agent performance overview, audit logs |
| **Backend API** | Both frontends | Shared REST API |

### Problem → Solution Map

| Problem | Solution |
|---|---|
| No tool to project earnings before making a sale | Forward Incentive Calculator |
| Agents sell multiple products to one customer — no bulk entry | Multi-policy bulk sale flow |
| No record of which customer holds which policy | PolicyHolder model + Customer ↔ Policy relationship |
| Agent cannot see their own book of business | Agent My Policies + My Customers pages |
| Admins have no visibility into agent-level performance | Admin Agent Overview + Agent Detail drill-through |
| No way to reverse-plan from income goals | Reverse Income Planner |
| Agents need condition-based lapse forecasting | Simulation Module |
| MDRT progress invisible until too late | MDRT Tracker with daily run-rate |
| Meeting activity not tied to income | Activity-to-Income Predictor |
| Dashboard lacks issuance and sell pattern visibility | Issuance Forecast + Policy Wise Sell Distribution |
| Renewal-priority customers are hard to track manually | Priority Customer Renewal Notification |
| Admins manually create every agent account | Agent self-registration with admin approval workflow |

### Terminology Glossary

| Term | Definition |
|---|---|
| **AAP** | Average Annual Premium — mean annual premium per policy |
| **FYC** | First Year Commission — commission on Year 1 premium |
| **Persistency Rate** | % of policies remaining active after Year 1 |
| **Renewal Commission** | Commission on active policies in Years 2–5 |
| **MDRT** | Million Dollar Round Table — annual premium-based qualification |
| **Bonus Slab** | Tier-based incentive when premium crosses a configured threshold |
| **PolicyHolder** | The customer/insured person — a separate entity from the agent |
| **Bulk Sale** | A single agent transaction that creates multiple policy records at once |
| **Config-driven** | All rates live in the `configs` DB collection; none hardcoded |
| **Registration Request** | A self-submitted agent application pending admin approval |
| **Approval Status** | State of a registration: `pending`, `approved`, `rejected` |
| **Temporary Password** | System-generated password sent to agent upon approval |

---

## 2. Tech Stack

### Frontend (Both Apps)

| Concern | Library | Version |
|---|---|---|
| Framework | React | 18.x |
| Language | TypeScript | 5.x (strict mode) |
| Build Tool | Vite | 5.x |
| Routing | React Router | v6 |
| Global State | Zustand | 4.x |
| HTTP Client | Axios | 1.x |
| Form Management | React Hook Form | 7.x |
| Schema Validation | Zod | 3.x |
| Form-Zod Bridge | `@hookform/resolvers` | 3.x |
| **Charts & Graphs** | **Recharts** | **2.x** |
| UI Primitives | Radix UI | latest |
| Styling | Tailwind CSS | 3.x |
| Date Utilities | date-fns | 3.x |
| Currency Format | `Intl.NumberFormat` | built-in |

### Backend

| Concern | Library | Version |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Framework | Express | 4.x |
| Language | TypeScript | 5.x (strict mode) |
| Database ODM | Mongoose | 8.x |
| Database | MongoDB | 7.x |
| Schema Validation | Zod | 3.x |
| Authentication | `jsonwebtoken` | 9.x |
| Password Hashing | `bcrypt` | 5.x |
| Logging | Winston | 3.x |
| Request ID | `uuid` | 9.x |

---

## 3. Authentication & Roles

### Login Flow

```
POST /api/auth/login
Input: { employeeId: string, password: string }

1. Find active user by employeeId
2. bcrypt.compare(password, user.passwordHash)
3. If mustChangePassword === true → return { mustChangePassword: true, token: null }
4. Generate JWT (RS256): { sub: user._id, role, branchId }
  expiresIn: "1h" (agent) | "6h" (admin)
5. Return: { token, role, expiresIn, mustChangePassword }
```

### Role Access Matrix

| Feature | Agent | Admin |
|---|---|---|
| All calculator modules | ✅ | ❌ |
| Own dashboard with charts | ✅ | ✅ |
| Create / list / view own policies | ✅ | ❌ |
| Create / list / view own customers | ✅ | ❌ |
| Commission config | ❌ | ✅ |
| User management | ❌ | ✅ |
| Agent overview + detail | ❌ | ✅ |
| Audit logs | ❌ | ✅ |

### Token Middleware

```typescript
// authenticate.ts
export function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json(error('MISSING_TOKEN'));
  try {
    req.user = jwt.verify(token, process.env.JWT_PUBLIC_KEY);
    next();
  } catch (e) {
    const code = e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return res.status(401).json(error(code));
  }
}

// requireRole.ts
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json(error('FORBIDDEN'));
  next();
};
```

---

## 4. Agent Self-Registration & Approval Workflow

### 4.1 Feature Overview

Agents can submit a registration request from the **public-facing registration page** (no login required). The request enters an `agentRegistrations` collection with status `pending`. Admin reviews and either **approves** or **rejects** the request. On approval, a `User` document is created and a temporary password is sent to the agent's registered email/mobile.

### 4.2 Registration Flow — Step by Step

```
┌─────────────────────────────────────────────────────────────┐
│  AGENT                                                      │
│  1. Visits /register (public page, no auth required)        │
│  2. Fills registration form                                 │
│  3. Submits → POST /api/auth/register                       │
│  4. Receives: "Your application is under review"            │
│  5. Gets email/SMS notification when approved or rejected   │
│  6. On approval: receives temporary password                │
│  7. Logs in with employeeId + temp password                 │
│  8. Forced to change password on first login                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ADMIN                                                      │
│  1. Sees badge on sidebar: "Pending Approvals (N)"          │
│  2. Navigates to /admin/registrations                       │
│  3. Reviews registration details per applicant              │
│  4. Clicks Approve OR Reject (with optional rejection note) │
│  5. On Approve:                                             │
│     a. System creates User document (isActive: true)        │
│     b. System generates temporary password (UUID-based)     │
│     c. System sends email + SMS to agent                    │
│     d. AuditLog entry created                               │
│  6. On Reject:                                              │
│     a. Registration status → 'rejected'                     │
│     b. rejectionNote saved                                  │
│     c. Agent notified via email + SMS                       │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Registration States

```
pending   → Initial state after agent submits form
approved  → Admin approved; User document created; temp password sent
rejected  → Admin rejected; rejectionNote recorded; agent notified
```

**State transition rules:**
- `pending` → `approved` (admin action only)
- `pending` → `rejected` (admin action only)
- `approved` and `rejected` are **terminal states** — no further transitions
- A rejected agent **may re-register** — a new `AgentRegistration` document is created; previous rejection is preserved in DB

### 4.4 AgentRegistration Data Model

```typescript
// backend/src/modules/agent-registration/model.ts
type RegistrationStatus = 'pending' | 'approved' | 'rejected';

interface IAgentRegistration {
  _id: Types.ObjectId;

  // Personal Info
  fullName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';

  // Professional Info
  employeeId: string;            // Desired employee ID — must be unique across users + pending registrations
  branchId: string;              // Branch they wish to join

  // Contact
  mobile: string;                // 10-digit Indian mobile
  email: string;                 // Required for approval notification
  panNumber: string;             // For identity verification

  // Qualifications
  licenseNumber: string;         // IRDAI license number
  licenseExpiry: Date;           // License must not be expired
  yearsOfExperience: number;     // 0 = fresher

  // Status
  status: RegistrationStatus;    // default: 'pending'
  rejectionNote: string | null;  // set on rejection
  reviewedBy: Types.ObjectId | null;  // admin who approved/rejected
  reviewedAt: Date | null;

  // Linked User (set on approval)
  userId: Types.ObjectId | null; // references users collection

  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const AgentRegistrationSchema = new Schema<IAgentRegistration>(
  {
    fullName:          { type: String, required: true, trim: true },
    dateOfBirth:       { type: Date, required: true },
    gender:            { type: String, enum: ['male','female','other'], required: true },
    employeeId:        { type: String, required: true, trim: true, uppercase: true },
    branchId:          { type: String, required: true, trim: true },
    mobile:            { type: String, required: true, match: /^\d{10}$/ },
    email:             { type: String, required: true, lowercase: true, trim: true },
    panNumber:         { type: String, required: true, uppercase: true },
    licenseNumber:     { type: String, required: true, trim: true },
    licenseExpiry:     { type: Date, required: true },
    yearsOfExperience: { type: Number, required: true, min: 0 },
    status:            { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
    rejectionNote:     { type: String, default: null },
    reviewedBy:        { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt:        { type: Date, default: null },
    userId:            { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Indexes
AgentRegistrationSchema.index({ status: 1, createdAt: -1 });
AgentRegistrationSchema.index({ employeeId: 1 });
AgentRegistrationSchema.index({ mobile: 1 });
AgentRegistrationSchema.index({ panNumber: 1 });
AgentRegistrationSchema.index({ email: 1 });
```

### 4.5 Updated User Model Fields

```typescript
// Add to IUser:
interface IUser {
  // ... existing fields ...
  registrationId: Types.ObjectId | null; // links back to AgentRegistration if self-registered
  onboardedBy: 'self_registration' | 'admin_created'; // tracks how account was created
}
```

### 4.6 Registration API — Backend Controller

#### `POST /api/auth/register` — Public endpoint (no auth)

```
INPUT: validated by AgentRegistrationSchema (Zod)

STEP 1: Check duplicate employeeId
  → Search BOTH users collection AND agentRegistrations (status: 'pending' | 'approved')
  → If found in users → HTTP 409 EMPLOYEE_ID_TAKEN
  → If found in pending registrations → HTTP 409 REGISTRATION_ALREADY_PENDING

STEP 2: Check duplicate mobile + email across both collections (same logic)
  → HTTP 409 MOBILE_TAKEN | EMAIL_TAKEN

STEP 3: Validate licenseExpiry > today
  → HTTP 400 LICENSE_EXPIRED

STEP 4: Insert AgentRegistration with status = 'pending'

STEP 5: Send acknowledgement notification (email/SMS):
  Subject: "Application Received — Canara HSBC Agent Portal"
  Body: "Your registration (ID: {registration._id}) is under review. You will be notified within 2–3 business days."

STEP 6: Return HTTP 201:
{
  "success": true,
  "data": {
    "registrationId": "string",
    "message": "Your application has been submitted successfully and is under review.",
    "status": "pending"
  }
}
```

#### `GET /api/auth/register/status/:registrationId` — Public endpoint (no auth)

```
INPUT: registrationId (path param)

STEP 1: Find AgentRegistration by _id
STEP 2: If not found → HTTP 404

STEP 3: Return status-safe response (no PII beyond what agent entered):
{
  "registrationId": string,
  "status": "pending" | "approved" | "rejected",
  "submittedAt": Date,
  "reviewedAt": Date | null,
  "rejectionNote": string | null   // only if status = 'rejected'
}
```

#### `GET /api/admin/registrations` — Admin only

```
QUERY PARAMS:
  status: 'pending' | 'approved' | 'rejected' | 'all'  (default: 'pending')
  page, limit, sortBy, sortOrder, search (name/mobile/employeeId)

STEP 1: Build filter: { status: query.status } (or all if 'all')
STEP 2: countDocuments() + find() in parallel
STEP 3: Return paginated list with meta.pagination

RESPONSE per item:
{
  _id, fullName, employeeId, branchId, mobile, email,
  panNumber, licenseNumber, licenseExpiry, yearsOfExperience,
  status, rejectionNote, reviewedBy, reviewedAt, createdAt
}
```

#### `GET /api/admin/registrations/:id` — Admin only

```
STEP 1: Find AgentRegistration by _id
STEP 2: If not found → HTTP 404
STEP 3: Return full registration document
```

#### `POST /api/admin/registrations/:id/approve` — Admin only

```
INPUT: { branchId?: string }
// Admin may override branchId from what agent entered

STEP 1: Find registration WHERE _id = :id AND status = 'pending'
  → If not found → HTTP 404
  → If status !== 'pending' → HTTP 409 ALREADY_REVIEWED

STEP 2: Check employeeId still unique in users collection
  → HTTP 409 EMPLOYEE_ID_TAKEN

STEP 3: Generate temporaryPassword = crypto.randomUUID().slice(0,12).toUpperCase()

STEP 4: Create User document (in MongoDB transaction):
  {
    employeeId:         registration.employeeId,
    passwordHash:       bcrypt.hashSync(temporaryPassword, 12),
    role:               'agent',
    name:               registration.fullName,
    branchId:           input.branchId || registration.branchId,
    isActive:           true,
    mustChangePassword: true,
    registrationId:     registration._id,
    onboardedBy:        'self_registration',
  }

STEP 5: Update AgentRegistration (in same transaction):
  {
    status:     'approved',
    reviewedBy: req.user.sub,
    reviewedAt: new Date(),
    userId:     newUser._id,
  }

STEP 6: Write AuditLog: action = 'user_created', performedBy = req.user.sub

STEP 7: Send approval notification to agent:
  Email subject: "Welcome to Canara HSBC Agent Portal — Account Approved"
  Email body: "Your Employee ID is {employeeId}. Your temporary password is {temporaryPassword}. 
               Please log in at {portalURL} and change your password immediately."
  SMS: "Canara HSBC: Your agent account is approved. EmpID: {employeeId} TempPwd: {temporaryPassword} Login: {shortURL}"

STEP 8: Return HTTP 200:
{
  "success": true,
  "data": {
    "userId": string,
    "employeeId": string,
    "message": "Registration approved. Agent has been notified with login credentials."
  }
}
```

#### `POST /api/admin/registrations/:id/reject` — Admin only

```
INPUT: { rejectionNote: string }  // required — must give reason

STEP 1: Find registration WHERE _id = :id AND status = 'pending'
  → If not found → HTTP 404
  → If status !== 'pending' → HTTP 409 ALREADY_REVIEWED

STEP 2: Update AgentRegistration:
  {
    status:        'rejected',
    rejectionNote: input.rejectionNote,
    reviewedBy:    req.user.sub,
    reviewedAt:    new Date(),
  }

STEP 3: Write AuditLog: action = 'registration_rejected'

STEP 4: Send rejection notification to agent:
  Email subject: "Application Update — Canara HSBC Agent Portal"
  Email body: "We regret to inform you that your registration has not been approved at this time.
               Reason: {rejectionNote}
               You may re-apply after 30 days."
  SMS: "Canara HSBC: Your agent application was not approved. {rejectionNote} Contact branch for details."

STEP 5: Return HTTP 200:
{
  "success": true,
  "data": { "message": "Registration rejected. Agent has been notified." }
}
```

#### `GET /api/admin/registrations/stats` — Admin only

```
Returns aggregated counts for dashboard badge and charts:
{
  pending:  number,
  approved: number,
  rejected: number,
  total:    number,
  todayNew: number,       // submitted today
  weekNew:  number,       // submitted this week
  avgReviewTimeHours: number  // avg time from submission to review
}
```

### 4.7 Notification Service

```typescript
// backend/src/utils/notificationService.ts

interface NotificationPayload {
  to: { email: string; mobile: string; name: string };
  type: 'registration_received' | 'registration_approved' | 'registration_rejected';
  data: Record<string, string>;
}

// Phase 1: Log notifications to console + AuditLog
// Phase 2: Integrate with SendGrid (email) + Twilio/MSG91 (SMS)
async function sendNotification(payload: NotificationPayload): Promise<void> {
  // Template resolution based on payload.type
  // Log to Winston in Phase 1
  // Enqueue to email/SMS provider in Phase 2
}
```

**Notification templates:**

| Event | Email | SMS |
|---|---|---|
| Registration received | "Application Received" with registration ID | "Application submitted. Track: {id}" |
| Approved | "Account Approved" with employeeId + temp password | "Approved. EmpID: X TempPwd: Y" |
| Rejected | "Application Update" with rejection reason | "Not approved. {reason}" |

### 4.8 Updated Role Access Matrix

| Feature | Public | Agent | Admin |
|---|---|---|---|
| Self-registration page | ✅ | ❌ | ❌ |
| Check registration status | ✅ | ❌ | ❌ |
| All calculator modules | ❌ | ✅ | ❌ |
| Own dashboard with charts | ❌ | ✅ | ✅ |
| Create / list own policies | ❌ | ✅ | ❌ |
| Create / list own customers | ❌ | ✅ | ❌ |
| Commission config | ❌ | ❌ | ✅ |
| User management | ❌ | ❌ | ✅ |
| **View pending registrations** | ❌ | ❌ | ✅ |
| **Approve registrations** | ❌ | ❌ | ✅ |
| **Reject registrations** | ❌ | ❌ | ✅ |
| Agent overview + detail | ❌ | ❌ | ✅ |
| Audit logs | ❌ | ❌ | ✅ |

---

## 5. Data Models

### 5.1 User Model

```typescript
// backend/src/modules/user/model.ts
interface IUser {
  _id: Types.ObjectId;
  employeeId: string;           // unique, trimmed
  passwordHash: string;         // bcrypt cost ≥ 12
  role: 'agent' | 'admin';
  name: string;
  branchId: string;
  isActive: boolean;
  mustChangePassword: boolean;  // true on account creation and after approval
  registrationId: Types.ObjectId | null;  // links to AgentRegistration if self-registered
  onboardedBy: 'self_registration' | 'admin_created'; // how account was created
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
UserSchema.index({ employeeId: 1 }, { unique: true });
UserSchema.index({ role: 1, branchId: 1 });
```

### 5.2 PolicyHolder (Customer) Model

```typescript
// backend/src/modules/policy-holder/model.ts
interface IPolicyHolder {
  _id: Types.ObjectId;
  agentId: Types.ObjectId;          // owning agent
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  panNumber: string;                // uppercase, unique per agent
  aadhaarLast4: string;             // last 4 digits ONLY
  mobile: string;                   // 10-digit Indian mobile
  email: string | null;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;                // 6-digit
  };
  relationToProposer: 'self' | 'spouse' | 'child' | 'parent' | 'other';
  totalActivePolicies: number;      // denormalized
  totalAnnualPremium: number;       // denormalized
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
PolicyHolderSchema.index({ agentId: 1, panNumber: 1 }, { unique: true });
PolicyHolderSchema.index({ agentId: 1 });
PolicyHolderSchema.index({ mobile: 1 });
```

### 5.3 AgentPolicy Model

```typescript
// backend/src/modules/agent-policy/model.ts
interface IAgentPolicy {
  _id: Types.ObjectId;
  agentId: Types.ObjectId;
  policyHolderId: Types.ObjectId;
  saleTransactionId: string;        // UUID v4 — groups all policies from one bulk sale
  productId: Types.ObjectId;
  productName: string;              // denormalized
  policyNumber: string;             // unique
  annualPremium: number;
  sumAssured: number;
  policyTerm: number;               // years
  premiumPayingTerm: number;        // years; must be ≤ policyTerm
  paymentFrequency: 'annual' | 'semi-annual' | 'quarterly' | 'monthly';
  issueDate: Date;
  maturityDate: Date;               // computed: issueDate + policyTerm years
  persistencyStatus: 'active' | 'lapsed' | 'surrendered';
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
AgentPolicySchema.index({ agentId: 1, issueDate: -1 });
AgentPolicySchema.index({ policyHolderId: 1 });
AgentPolicySchema.index({ saleTransactionId: 1 });
AgentPolicySchema.index({ policyNumber: 1 }, { unique: true });
AgentPolicySchema.index({ persistencyStatus: 1 });
AgentPolicySchema.index({ isDeleted: 1 });

// Pre-find middleware: exclude soft-deleted unless explicitly requested
AgentPolicySchema.pre('find', function () {
  if (this.getFilter().isDeleted === undefined) this.where({ isDeleted: false });
});
```

### 5.4 Product Model

```typescript
interface IProduct {
  _id: Types.ObjectId;
  name: 'Term Plan' | 'Savings Plan' | 'ULIP' | 'Endowment';
  fyCommissionRate: number;         // float 0–1
  renewalRates: {
    year2: number; year3: number; year4: number; year5: number;
  };
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
// Index: { name: 1, effectiveFrom: 1 }
```

### 5.5 CommissionConfig Model

```typescript
interface ICommissionConfig {
  _id: Types.ObjectId;
  slabs: Array<{
    minPremium: number;
    maxPremium: number | null;
    bonusRate: number;              // float 0–1
  }>;
  persistencyThreshold: number;    // float 0–1
  mdrtTarget: number;              // INR
  effectiveFrom: Date;
  effectiveTo: Date | null;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
// Index: { effectiveFrom: 1, effectiveTo: 1 }
```

### 5.6 AuditLog Model

```typescript
type AuditAction =
  | 'commission_config_updated' | 'user_created' | 'user_updated'
  | 'product_updated' | 'policy_created' | 'policy_deleted' | 'customer_created';

interface IAuditLog {
  _id: Types.ObjectId;
  action: AuditAction;
  performedBy: Types.ObjectId;
  targetId: Types.ObjectId;
  diff: { before: Record<string, unknown>; after: Record<string, unknown> };
  createdAt: Date;
  updatedAt: Date;
}
// Indexes: { performedBy: 1, createdAt: -1 }, { action: 1 }
```

### 4.7 MongoDB Collections Index Summary

| Collection | Index Fields | Type |
|---|---|---|
| `users` | `employeeId` | Unique |
| `users` | `role`, `branchId` | Compound |
| `policyHolders` | `agentId`, `panNumber` | Unique Compound |
| `policyHolders` | `agentId` | Single |
| `policyHolders` | `mobile` | Single |
| `agentPolicies` | `agentId`, `issueDate` DESC | Compound |
| `agentPolicies` | `policyHolderId` | Single |
| `agentPolicies` | `saleTransactionId` | Single |
| `agentPolicies` | `policyNumber` | Unique |
| `agentPolicies` | `persistencyStatus` | Single |
| `agentPolicies` | `isDeleted` | Single |
| `products` | `name`, `effectiveFrom` | Compound |
| `configs` | `effectiveFrom`, `effectiveTo` | Compound |
| `logs` | `performedBy`, `createdAt` DESC | Compound |
| `logs` | `action` | Single |

> All collections use `{ timestamps: true }`.

---

## 5. Zod Validation Schemas

### 5.1 Policy Schema (Backend)

```typescript
// backend/src/schemas/policy.schema.ts
const ProductTypeEnum = z.enum(['Term Plan', 'Savings Plan', 'ULIP', 'Endowment']);

export const PolicyLineItemSchema = z.object({
  policyHolderId: z.string().regex(/^[a-f\d]{24}$/i),
  productId:      z.string().regex(/^[a-f\d]{24}$/i),
  productType:    ProductTypeEnum,
  policyNumber:   z.string().min(6).max(30).trim(),
  annualPremium:  z.number().positive(),
  sumAssured:     z.number().positive(),
  policyTerm:     z.number().int().min(1).max(40),
  premiumPayingTerm: z.number().int().min(1),
  paymentFrequency: z.enum(['annual','semi-annual','quarterly','monthly']).default('annual'),
  issueDate:      z.string().datetime(),
});

export const BulkSalePoliciesSchema = z.object({
  policies: z.array(PolicyLineItemSchema).min(1).max(20),
});

export const PolicyListQuerySchema = z.object({
  page:           z.coerce.number().int().min(1).default(1),
  limit:          z.coerce.number().int().min(1).max(100).default(20),
  status:         z.enum(['active','lapsed','surrendered']).optional(),
  productType:    ProductTypeEnum.optional(),
  policyHolderId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  sortBy:         z.enum(['issueDate','annualPremium','productName']).default('issueDate'),
  sortOrder:      z.enum(['asc','desc']).default('desc'),
  search:         z.string().max(100).optional(),
});
```

### 5.2 Customer Schema (Backend)

```typescript
// backend/src/schemas/customer.schema.ts
export const CreatePolicyHolderSchema = z.object({
  firstName:   z.string().min(2).max(50).trim(),
  lastName:    z.string().min(1).max(50).trim(),
  dateOfBirth: z.string().date()
    .refine(val => new Date(val) < new Date())
    .refine(val => {
      const age = new Date().getFullYear() - new Date(val).getFullYear();
      return age >= 18 && age <= 99;
    }),
  gender:      z.enum(['male','female','other']),
  panNumber:   z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).toUpperCase(),
  aadhaarLast4: z.string().regex(/^\d{4}$/),
  mobile:      z.string().regex(/^[6-9]\d{9}$/),
  email:       z.string().email().toLowerCase().optional().nullable(),
  address: z.object({
    street:  z.string().min(3).max(200),
    city:    z.string().min(2).max(100),
    state:   z.string().min(2).max(100),
    pincode: z.string().regex(/^\d{6}$/),
  }),
  relationToProposer: z.enum(['self','spouse','child','parent','other']).default('self'),
});
```

### 5.3 Calculator Schema (Backend)

```typescript
// backend/src/schemas/calculator.schema.ts
const PersistencyField = z.number().min(0).max(1).default(0.8);

// Module 1 — Single Mode
export const ForwardCalcSchema = z.object({
  policiesSold:         z.number().int().min(1),
  averageAnnualPremium: z.number().positive(),
  productType:          ProductTypeEnum,
  persistencyRate:      PersistencyField,
  bonusSlabId:          z.string().regex(/^[a-f\d]{24}$/i).optional(),
});

// Module 1 — Bulk Mode
export const ForwardCalcBulkSchema = z.object({
  mode: z.literal('bulk'),
  policies: z.array(z.object({
    productType:     ProductTypeEnum,
    annualPremium:   z.number().positive(),
    persistencyRate: PersistencyField,
  })).min(1).max(50),
  bonusSlabId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
});

// Module 2
export const ReverseCalcSchema = z.object({
  targetIncome:    z.number().positive(),
  incomePeriod:    z.enum(['monthly','quarterly']),
  productType:     ProductTypeEnum.optional(),
  bonusSlabId:     z.string().regex(/^[a-f\d]{24}$/i).optional(),
  conversionRate:  z.number().min(0.01).max(1).optional(),
});

// Module 3 — Simulation Module
export const SimulationModuleSchema = z.object({
  conditionKey: z.string().min(1).max(100).trim(),
  productType: ProductTypeEnum.optional(),
  policiesSold: z.number().int().min(1).optional(),
  averageAnnualPremium: z.number().positive().optional(),
});

// Module 4
export const MDRTTrackerSchema = z.object({
  manualOverridePremium: z.number().min(0).optional(),
});

// Module 5
export const ActivityPredictorSchema = z.object({
  meetingsPerWeek:       z.number().int().min(1),
  conversionRate:        z.number().min(0.01).max(1),
  averagePremiumPerSale: z.number().positive(),
  productType:           ProductTypeEnum,
});
```

### 5.4 Admin Schema (Backend)

```typescript
// backend/src/schemas/admin.schema.ts
export const CommissionConfigSchema = z.object({
  slabs: z.array(z.object({
    minPremium: z.number().min(0),
    maxPremium: z.number().positive().nullable(),
    bonusRate:  z.number().min(0).max(1),
  })).min(1),
  persistencyThreshold: z.number().min(0).max(1),
  mdrtTarget:           z.number().positive(),
  effectiveFrom:        z.string().datetime()
    .refine(val => new Date(val) >= new Date(new Date().toDateString())),
}).superRefine((data, ctx) => {
  const sorted = [...data.slabs].sort((a, b) => a.minPremium - b.minPremium);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (a.maxPremium !== null && a.maxPremium >= b.minPremium) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Slabs overlap`, path: ['slabs'] });
    }
  }
});

export const AgentOverviewQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  branchId:   z.string().optional(),
  mdrtStatus: z.enum(['qualified','on-track','at-risk']).optional(),
  sortBy:     z.enum(['name','ytdPremium','policyCount','persistencyRate']).default('ytdPremium'),
  sortOrder:  z.enum(['asc','desc']).default('desc'),
  search:     z.string().max(100).optional(),
});
```

---

## 6. Backend API Modules

### 6.1 API Response Envelope

```typescript
// All API responses use this wrapper — no raw data outside it
interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: Record<string, string[]> } | null;
  meta: {
    timestamp: string;
    requestId: string;
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  };
}
```

### 6.2 Bulk Policy Create — `POST /api/policies/bulk`

```
INPUT: { policies: PolicyLineItem[] }

STEP 1: Verify all policyHolderIds belong to req.user.sub
  → PolicyHolder.find({ _id: { $in: ids }, agentId: req.user.sub })
  → If any missing → HTTP 400 INVALID_CUSTOMER

STEP 2: Check policyNumbers for duplicates
  → AgentPolicy.find({ policyNumber: { $in: numbers } })
  → If any found → HTTP 409 POLICY_NUMBER_CONFLICT

STEP 3: Verify all productIds are active
  → Product.find({ _id: { $in: ids }, isActive: true })
  → If any missing → HTTP 400 INVALID_PRODUCT

STEP 4: Validate premiumPayingTerm ≤ policyTerm for each policy

STEP 5: saleTransactionId = uuidv4()

STEP 6: Compute maturityDate = issueDate + policyTerm years (per policy)

STEP 7: MongoDB session transaction:
  → AgentPolicy.insertMany([...policies], { session })
  → For each unique policyHolderId:
      PolicyHolder.updateOne(
        { _id: policyHolderId },
        { $inc: { totalActivePolicies: count, totalAnnualPremium: sum } },
        { session }
      )
  → If any insert fails → rollback entire transaction

STEP 8: Write AuditLog (best effort, outside transaction)

STEP 9: Return created policies + saleTransactionId
```

### 6.3 List Agent Policies — `GET /api/policies`

```
QUERY: { page, limit, status?, productType?, policyHolderId?, sortBy, sortOrder, search? }

STEP 1: Build filter: { agentId: req.user.sub }
  + status filter if provided
  + productType filter if provided
  + policyHolderId filter if provided
  + policyNumber regex if search provided

STEP 2: countDocuments() + find() in parallel

STEP 3: Populate policyHolderId with (firstName, lastName, mobile, panNumber)

STEP 4: Return paginated results with meta.pagination
```

### 6.4 Customer Module

```
POST /api/customers
  → Check duplicate PAN: PolicyHolder.findOne({ agentId, panNumber })
  → If found → HTTP 409 DUPLICATE_PAN
  → Insert PolicyHolder with agentId = req.user.sub

GET /api/customers/:id
  → Find PolicyHolder WHERE _id = :id AND agentId = req.user.sub
  → AgentPolicy.find({ policyHolderId: :id }) sorted issueDate DESC
  → Compute summary: { totalPolicies, activePolicies, totalAnnualPremium, productBreakdown[] }
  → Return { customer, policies, summary }

PATCH /api/customers/:id
  → Allowed fields: mobile, email, address, relationToProposer
  → NOT allowed: panNumber, dateOfBirth, firstName, lastName
```

### 6.5 Admin Agent Overview — `GET /api/admin/agents`

```
STEP 1: Filter agents: { role: 'agent', isActive: true, ...queryFilters }

STEP 2: MongoDB aggregation pipeline per agent:
  ytdPremium     = SUM(annualPremium WHERE issueDate ≥ Jan 1 currentYear AND persistencyStatus = 'active')
  policyCount    = COUNT(agentPolicies WHERE isDeleted = false)
  activePolicies = COUNT(agentPolicies WHERE persistencyStatus = 'active')
  persistencyRate = activePolicies / policyCount
  customerCount   = COUNT(policyHolders WHERE agentId)

STEP 3: Fetch CommissionConfig.mdrtTarget (active config)

STEP 4: Compute per agent:
  percentAchieved = min((ytdPremium / mdrtTarget) * 100, 100)
  mdrtStatus:
    ≥ 100% → 'qualified'
    ≥ 70%  → 'on-track'
    < 70%  → 'at-risk'

STEP 5: Apply mdrtStatus filter if provided, apply sortBy

STEP 6: Return paginated agent performance table
```

### 6.6 Admin Agent Detail — `GET /api/admin/agents/:id`

```
Parallel fetch:
  A. Full policy list with policyHolder + product populated
  B. Customer list
  C. MDRT calculation
  D. Monthly premium timeline (last 12 months):
     Group agentPolicies by month of issueDate → sum annualPremium per month

Return:
{
  agent: IUser (minus passwordHash),
  performance: {
    ytdPremium, policyCount, activePolicies,
    persistencyRate, customerCount,
    mdrtTarget, percentAchieved, mdrtStatus,
    estimatedQualificationDate
  },
  policies: IAgentPolicy[],
  customers: IPolicyHolder[],
  monthlyTimeline: { month: string; premium: number }[]  // 12 months
}
```

---

## 7. Core Calculation Logic

### Module 1 — Forward Calculator

```
// Single Mode
totalAnnualPremium    = policiesSold × averageAnnualPremium
annualNewBusinessIncome = totalAnnualPremium × fyCommissionRate

// Persistency decay per year
function applyPersistencyDecay(count: number, rate: number): number[] {
  return [1, 2, 3, 4, 5].map(yr => Math.floor(count * Math.pow(rate, yr)));
}

// Bonus
annualBonusEarnings = totalAnnualPremium > slab.minPremium ? totalAnnualPremium × bonusRate : 0

// 5-year growth view assumes the same annual production repeats each year.
for projectionYear in [1..5]:
  renewalCarryForward[projectionYear] = sum over age in [1..projectionYear-1] of (
    floor(policiesSold × persistencyRate^age) × AAP × renewalRates[age + 1]
  )

  projectedInForcePolicies[projectionYear] = policiesSold + sum over age in [1..projectionYear-1] of (
    floor(policiesSold × persistencyRate^age)
  )

  annualIncome[projectionYear] = annualNewBusinessIncome + annualBonusEarnings + renewalCarryForward[projectionYear]

renewalTotal = sum(renewalCarryForward[1..5])
bonusEarnings = annualBonusEarnings × 5
totalCumulativeIncome = sum(annualIncome[1..5])

// Validation target:
// Year 1 is the lowest income year and Year 5 is the highest income year

// Bulk Mode — per policy, then aggregate
perPolicy = policies.map(p => {
  fyc = p.annualPremium × product.fyCommissionRate
  renewal = sum over years 2–5 of (activePolicies[yr] × p.annualPremium × renewalRates[yr])
  return { fyc, renewal, total: fyc + renewal }
})
aggregate = { totalFYC: sum(fyc), totalRenewal: sum(renewal), totalCumulative: sum(total) }
```

### Module 2 — Reverse Income Planner

```
annualTarget      = targetIncome × 12  (monthly) | × 4  (quarterly)
incomePerRupee    = fyCommissionRate + avg(renewalRates)
requiredPremium   = annualTarget / incomePerRupee
requiredPolicies  = ceil(requiredPremium / resolvedAAP)
requiredWeekly    = ceil(requiredPolicies / 52)
requiredDaily     = ceil(requiredPolicies / 365)

// If conversionRate provided:
requiredMeetings  = ceil(requiredPolicies / conversionRate)
meetingsPerWeek   = ceil(requiredMeetings / 52)
```

### Module 3 — Simulation Module

```
selectedCondition = companySimulationConditions.find(conditionKey)
companyParameters = selectedCondition.parameters

predictedPersistency = simulationEngine({
  condition: selectedCondition,
  parameters: companyParameters,
  productType,
  policiesSold,
  averageAnnualPremium,
})

activePolicies[yr]    = applyPersistencyDecay(policiesSold, predictedPersistency)
projectedRenewal[yr]  = activePolicies[yr] × AAP × renewalRates[yr]
totalProjectedRenewal = sum(projectedRenewal[1..5])

// Flow
// Select Condition -> Company-Defined Parameters Applied -> Persistency Prediction Generated
```

### Module 4 — MDRT Tracker

```
ytdPremium = SUM(annualPremium WHERE agentId AND issueDate ≥ Jan 1 currentYear AND status='active')
percentAchieved = (ytdPremium / mdrtTarget) × 100
remaining = max(0, mdrtTarget - ytdPremium)

daysElapsed = dayOfYear(today)
daysInYear  = 365 | 366
runRate     = ytdPremium / daysElapsed        // daily run rate
daysToQualify = remaining / runRate
estimatedDate = today + daysToQualify

mdrtStatus:
  percentAchieved >= 100 → 'qualified'
  percentAchieved >= 70  → 'on-track'
  else                   → 'at-risk'
```

### Module 5 — Activity-to-Income Predictor

```
weeksPerMonth      = 4.33
expectedPolicies   = floor(meetingsPerWeek × weeksPerMonth × conversionRate)
expectedPremium    = expectedPolicies × averagePremiumPerSale
expectedFYC        = expectedPremium × product.fyCommissionRate
expectedIncentive  = expectedFYC + (expectedFYC × bonusRate if eligible)
```

---

## 8. Frontend Structure

### Repository Layout

```
agent-incentive-platform/
├── frontend/
│   ├── agent-app/
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── auth/              LoginPage.tsx, ChangePasswordPage.tsx
│   │       │   ├── dashboard/         AgentDashboard.tsx
│   │       │   ├── calculator/        ForwardCalculator.tsx, ReverseCalculator.tsx,
│   │       │   │                      SimulationModule.tsx, MDRTTracker.tsx,
│   │       │   │                      ActivityPredictor.tsx
│   │       │   ├── policies/          MyPoliciesPage.tsx, PolicyDetailPage.tsx,
│   │       │   │                      CreatePolicyPage.tsx
│   │       │   └── customers/         MyCustomersPage.tsx, CustomerDetailPage.tsx
│   │       ├── components/
│   │       │   ├── layout/            Sidebar.tsx, TopBar.tsx, MobileTabBar.tsx,
│   │       │   │                      ProtectedRoute.tsx
│   │       │   ├── ui/                StatCard.tsx, MDRTRing.tsx, ResultsPanel.tsx,
│   │       │   │                      PersistencySlider.tsx, ToastProvider.tsx,
│   │       │   │                      ErrorCard.tsx, EmptyState.tsx,
│   │       │   │                      PolicyTable.tsx, CustomerCard.tsx,
│   │       │   │                      BulkPolicyEditor.tsx
│   │       │   └── charts/            RenewalForecastChart.tsx,
│   │       │                          PersistencyBarChart.tsx,
│   │       │                          MDRTRingChart.tsx,
│   │       │                          MonthlyPremiumChart.tsx,
│   │       │                          ProductMixPieChart.tsx,
│   │       │                          ActivityFunnelChart.tsx,
│   │       │                          IncomeGrowthAreaChart.tsx,
│   │       │                          PolicyStatusDonutChart.tsx,
│   │       │                          AgentLeaderboardChart.tsx,
│   │       │                          PersistencyTrendLineChart.tsx
│   │       ├── hooks/                 useAuth.ts, useDashboard.ts, useCalculator.ts,
│   │       │                          usePolicies.ts, useCustomers.ts, useToast.ts
│   │       ├── services/              api.ts, auth.service.ts, calculator.service.ts,
│   │       │                          dashboard.service.ts, policy.service.ts,
│   │       │                          customer.service.ts
│   │       ├── store/                 authStore.ts
│   │       ├── schemas/               (all Zod frontend schemas)
│   │       ├── types/                 api.types.ts, calculator.types.ts,
│   │       │                          policy.types.ts, customer.types.ts
│   │       └── utils/                 formatCurrency.ts, formatDate.ts
│   │
│   └── admin-app/
│       └── src/
│           ├── pages/                 AdminLoginPage.tsx, AdminDashboard.tsx,
│           │                          CommissionConfig.tsx, UserManagement.tsx,
│           │                          ProductManagement.tsx, AuditLogs.tsx,
│           │                          AgentOverview.tsx, AgentDetailPage.tsx
│           └── components/
│               ├── layout/            AdminSidebar.tsx, ProtectedRoute.tsx
│               └── ui/                SlabEditor.tsx, PreviewDiffModal.tsx,
│                                      UserTable.tsx, AgentPerformanceTable.tsx,
│                                      AgentPolicyList.tsx
│
└── backend/
    └── src/
        ├── modules/                   auth/, user/, product/, policy-holder/,
        │                              agent-policy/, config/, calculator/,
        │                              dashboard/, logs/
        ├── middleware/                authenticate.ts, requireRole.ts,
        │                              validate.ts, requestLogger.ts
        ├── schemas/                   (all Zod backend schemas)
        ├── utils/                     apiResponse.ts, AppError.ts, dateHelpers.ts
        ├── config/                    env.ts
        ├── routes/                    index.ts
        ├── app.ts
        └── server.ts
```

### Sidebar Navigation

**Agent App (desktop)**

```
Dashboard
Calculators ▾
  ├── Forward Calculator
  ├── Reverse Income Planner
  ├── Simulation Module
  ├── MDRT Tracker
  └── Activity Predictor
My Policies
My Customers
```

**Admin App**

```
Dashboard
Commission Config
User Management
Agent Performance
Products
Audit Logs
```

---

## 9. Dashboard & Charts Specification

> All charts use **Recharts 2.x**. All currency formatted via `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`. Brand colors: primary `#001E40`, amber `#FFBF00`, green `#36B24E`, red `#BA1A1A`.

---

### 9.1 Agent Dashboard (`/dashboard`)

#### Layout

```
┌─────────────────────────────────────────────────────┐
│  Header: "Performance Summary"  [New Application]   │
├──────────────┬──────────────┬───────────────────────┤
│ Current Month│ YTD Premium  │ YTD FYC Earned        │
│ Premium Card │ + progress   │ (highlighted card)    │
├──────────────┴──────────────┴───────────────────────┤
│  [MDRT Ring Chart — col-4]  [Issuance Forecast — col-4]   │
│                            [Policy Wise Sell Distribution] │
├─────────────────────────────────────────────────────┤
│  [Persistency Status Banner]                        │
├──────────────┬──────────────────────────────────────┤
│ [Policy Status│ [Income Growth Area Chart]          │
│  Donut Chart]│                                      │
├──────────────┴──────────────────────────────────────┤
│  [Product Mix Pie Chart — col-4] [Monthly Premium   │
│                                   Bar Chart - col-8]│
└─────────────────────────────────────────────────────┘
```

#### Stat Cards (top row)

Render 3 cards using `StatCard` component:

| Card | Value Source | Highlight Color |
|---|---|---|
| Current Month Premium | `GET /api/agent/dashboard → monthPremium` | Primary |
| YTD Premium (progress bar) | `ytdPremium` + `ytdTarget` | Amber |
| YTD FYC Earned | `ytdFYC` | Primary container |

Each `StatCard` props:
```typescript
interface StatCardProps {
  label: string;
  value: string;               // formatted currency
  change?: string;             // e.g. "+12.4%"
  changeDirection: 'up' | 'down' | 'neutral';
  icon: string;                // Material Symbol name
  subtext?: string;
  progressValue?: number;      // 0–100 for progress bar variant
}
```

---

#### Chart 1 — MDRT Ring Chart (`MDRTRingChart.tsx`)

**Library:** Recharts `RadialBarChart`

**Data source:** `GET /api/calculator/mdrt`

**Props:**
```typescript
interface MDRTRingChartProps {
  percentAchieved: number;     // 0–100
  ytdPremium: number;
  mdrtTarget: number;
  remaining: number;
  estimatedQualificationDate: string;
  mdrtStatus: 'qualified' | 'on-track' | 'at-risk';
  daysLeft: number;
}
```

**Render logic:**
```
1. RadialBarChart with single RadialBar
2. Fill color:
   - 'qualified' → #36B24E
   - 'on-track'  → #FFBF00
   - 'at-risk'   → #BA1A1A
3. Center label: percentAchieved% + status text
4. Below ring: two stat rows:
   - "Remaining Premium" → formatCurrency(remaining)
   - "Days Left" → daysLeft (color: red if < 90)
5. CTA link: "View Detailed MDRT Roadmap"
```

**Recharts implementation:**
```tsx
<RadialBarChart
  width={192} height={192}
  innerRadius="70%" outerRadius="100%"
  data={[{ value: percentAchieved, fill: statusColor }]}
  startAngle={90} endAngle={-270}
>
  <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#eeedf2' }} />
</RadialBarChart>
```

---

#### Chart 2 — Issuance Forecast Bar Chart (`IssuanceForecastChart.tsx`)

**Library:** Recharts `BarChart`

**Data source:** `GET /api/agent/dashboard → issuanceForecast`

**API response shape:**
```typescript
issuanceForecast: Array<{
  month: string;       // "Apr", "May", ... "Mar"
  projected: number;   // INR
  actual: number;      // INR (null for future months)
}>
```

**Props:**
```typescript
interface IssuanceForecastChartProps {
  data: { month: string; projected: number; actual: number | null }[];
  avgMonthlyIssuance: number;
  totalAnnualIssuance: number;
}
```

**Render logic:**
```
1. BarChart with two bars per month:
   - "Projected" → color #a7c8ff (light blue)
   - "Actual"    → color #001e40 (dark primary) — only for past months
2. X-axis: month labels
3. Y-axis: formatted INR (abbreviated: ₹1.2L)
4. Tooltip: shows both projected + actual on hover
5. Legend: "Projected" | "Actual"
6. Below chart: summary row — Avg Monthly Issuance | Total Annual Issuance
7. Export button (download icon) — triggers CSV download of chart data
```

**Recharts implementation:**
```tsx
<BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
  <CartesianGrid strokeDasharray="3 3" stroke="#eeedf2" />
  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#43474f' }} />
  <YAxis tickFormatter={v => `₹${(v/100000).toFixed(1)}L`} tick={{ fontSize: 10 }} />
  <Tooltip formatter={(v) => formatCurrency(v)} />
  <Legend />
  <Bar dataKey="projected" fill="#a7c8ff" radius={[2,2,0,0]} />
  <Bar dataKey="actual"    fill="#001e40" radius={[2,2,0,0]} />
</BarChart>
```

> Tree structure to be added in future for this chart.

#### Chart 2B — Policy Wise Sell Distribution (`PolicyWiseSellDistributionChart.tsx`)

**Library:** Recharts `BarChart` or `Treemap` in future

**Data source:** `GET /api/agent/dashboard → policyWiseSellDistribution`

**API response shape:**
```typescript
policyWiseSellDistribution: Array<{
  productType: 'Term Plan' | 'Savings Plan' | 'ULIP' | 'Endowment';
  policyCount: number;
  annualPremium: number;
}>
```

**Render logic:**
```
1. Show product-wise sell mix beside Issuance Forecast on dashboard
2. Default metric = policy count; secondary hover metric = annual premium
3. Surface strongest-selling product segment clearly
4. Future enhancement: replace bar layout with tree structure visualization
```

### 9.1.1 Priority Customer Renewal Notification

**Sub-features:**
- High Risk Plan Only
- Fixed Return Every Month
- Option to manually add customers to this list

**Render logic:**
```
1. Show a priority customer renewal list on the dashboard or renewal workspace
2. Filter and highlight high-risk plans first
3. Surface fixed-return customers due every month
4. Allow manual customer addition to the tracked renewal list
```

---

#### Chart 3 — Policy Status Donut Chart (`PolicyStatusDonutChart.tsx`)

**Library:** Recharts `PieChart` with `Pie` (inner radius set for donut)

**Data source:** `GET /api/agent/dashboard → policyStatusBreakdown`

**API response shape:**
```typescript
policyStatusBreakdown: {
  active:      number;   // count
  lapsed:      number;
  surrendered: number;
}
```

**Render logic:**
```
1. PieChart donut with 3 segments:
   - Active      → #36B24E
   - Lapsed      → #BA1A1A
   - Surrendered → #737780
2. Center label: total policy count
3. Legend below: color dot + label + count + percentage
4. Tooltip on hover: shows count + percentage
```

**Recharts implementation:**
```tsx
<PieChart width={220} height={220}>
  <Pie
    data={pieData}
    cx="50%" cy="50%"
    innerRadius={60} outerRadius={90}
    dataKey="value"
    paddingAngle={2}
  >
    {pieData.map((entry, i) => (
      <Cell key={i} fill={COLORS[entry.name]} />
    ))}
  </Pie>
  <Tooltip formatter={(v, n) => [`${v} policies`, n]} />
  <Legend />
</PieChart>
```

---

#### Chart 4 — Product Mix Pie Chart (`ProductMixPieChart.tsx`)

**Library:** Recharts `PieChart`

**Data source:** `GET /api/agent/dashboard → productMix`

**API response shape:**
```typescript
productMix: Array<{
  productType: 'Term Plan' | 'Savings Plan' | 'ULIP' | 'Endowment';
  count: number;
  totalPremium: number;
  percentage: number;
}>
```

**Render logic:**
```
1. Standard PieChart (no inner radius — full pie)
2. Colors: Term Plan #001E40, Savings Plan #FFBF00, ULIP #36B24E, Endowment #3a5f94
3. Label: shows productType + percentage on slice
4. Tooltip: productType | count policies | ₹totalPremium
5. Toggle below chart: "By Count" / "By Premium" — switches dataKey
```

---

#### Chart 5 — Income Growth Area Chart (`IncomeGrowthAreaChart.tsx`)

**Library:** Recharts `AreaChart`

**Data source:** `GET /api/agent/dashboard → incomeGrowth`

**API response shape:**
```typescript
incomeGrowth: Array<{
  month: string;       // last 12 months + 3 forecast months
  fyc: number;
  renewal: number;
  bonus: number;
  isForecast: boolean;
}>
```

**Render logic:**
```
1. AreaChart stacked with 3 areas: FYC, Renewal, Bonus
   - FYC     → fill #001e40, stroke #001e40
   - Renewal → fill #003366, stroke #003366
   - Bonus   → fill #FFBF00, stroke #FFBF00
2. Forecast months rendered with dashed stroke + reduced opacity fill
3. Vertical reference line at current month labeled "Today"
4. X-axis: month labels; Y-axis: formatted INR
5. Tooltip: shows breakdown of FYC + Renewal + Bonus = Total
6. Legend with color swatches
```

**Recharts implementation:**
```tsx
<AreaChart data={data}>
  <defs>
    <linearGradient id="fyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#001e40" stopOpacity={0.3}/>
      <stop offset="95%" stopColor="#001e40" stopOpacity={0}/>
    </linearGradient>
  </defs>
  <CartesianGrid strokeDasharray="3 3" stroke="#eeedf2" />
  <XAxis dataKey="month" />
  <YAxis tickFormatter={v => `₹${(v/100000).toFixed(1)}L`} />
  <Tooltip />
  <ReferenceLine x={currentMonth} stroke="#BA1A1A" strokeDasharray="4 4" label="Today" />
  <Area type="monotone" dataKey="fyc"     stackId="1" fill="url(#fyc)" stroke="#001e40" />
  <Area type="monotone" dataKey="renewal" stackId="1" fill="#eeedf2"   stroke="#003366" />
  <Area type="monotone" dataKey="bonus"   stackId="1" fill="#fff8e1"   stroke="#FFBF00" />
</AreaChart>
```

---

#### Chart 6 — Monthly Premium Bar Chart (`MonthlyPremiumChart.tsx`)

**Library:** Recharts `BarChart`

**Data source:** `GET /api/agent/dashboard → monthlyPremiumTimeline`

**Purpose:** Shows last 12 months of premium volume with current month highlighted.

**Render logic:**
```
1. BarChart, one bar per month
2. All bars → color #a7c8ff (light primary)
3. Current month bar → color #001e40 (dark primary) with top label showing exact value
4. X-axis: month abbreviation; Y-axis: ₹ abbreviated
5. Average line: ReferenceLine at avg premium with "Avg" label
6. Tooltip: formatted premium
```

---

### 9.2 Admin Dashboard (`/admin/dashboard`)

**Additional charts beyond agent dashboard:**

#### Chart 7 — Agent Leaderboard Bar Chart (`AgentLeaderboardChart.tsx`)

**Library:** Recharts `BarChart` (horizontal)

**Data source:** `GET /api/admin/dashboard → agentLeaderboard`

**API response shape:**
```typescript
agentLeaderboard: Array<{
  agentId: string;
  name: string;
  ytdPremium: number;
  mdrtStatus: 'qualified' | 'on-track' | 'at-risk';
}>
// sorted by ytdPremium DESC, top 10
```

**Render logic:**
```
1. Horizontal BarChart (layout="vertical")
2. Y-axis: agent names; X-axis: ₹ premium
3. Bar fill by mdrtStatus:
   - qualified  → #36B24E
   - on-track   → #FFBF00
   - at-risk    → #BA1A1A
4. MDRT target shown as ReferenceLine (vertical)
5. Each bar labeled with ₹ value at right edge
6. Clicking a bar navigates to agent detail (admin only)
```

#### Chart 8 — Team Persistency Trend Line Chart (`PersistencyTrendLineChart.tsx`)

**Library:** Recharts `LineChart`

**Data source:** `GET /api/admin/dashboard → teamPersistencyTrend`

**API response shape:**
```typescript
teamPersistencyTrend: Array<{
  month: string;
  teamRate: number;        // 0–1
  targetRate: number;      // from CommissionConfig.persistencyThreshold
  industryBenchmark: number;  // hardcoded 0.85 in config
}>
```

**Render logic:**
```
1. LineChart with 3 lines:
   - Team Rate     → color #001e40, strokeWidth 2
   - Target Rate   → color #36B24E, strokeDasharray "5 5"
   - Industry Avg  → color #FFBF00, strokeDasharray "3 3"
2. Y-axis: 0–100% formatted
3. Shaded area between Team Rate and Target Rate:
   - Above target → green fill (positive gap)
   - Below target → red fill (negative gap)
4. Tooltip: all 3 values + "Gap: X%" vs target
5. Legend with line styles
```

---

### 9.3 Admin Dashboard (`/admin/dashboard`)

#### Chart 9 — Portfolio Overview Stat Cards

4 stat cards at top:
- Total Premium YTD (all agents combined)
- Total Active Agents
- Average Persistency Rate (team)
- MDRT Qualified Count / Total

#### Chart 10 — Agent MDRT Status Distribution

**Library:** Recharts `PieChart`

**3 segments:** Qualified (green) | On Track (amber) | At Risk (red)

#### Chart 11 — Branch Performance Comparison (`AgentLeaderboardChart` reused)

Horizontal bar chart comparing ytdPremium by branchId, sorted DESC.

#### Chart 12 — Commission Config Timeline

**Library:** Recharts `LineChart`

Shows commission rate history over time per product type (from CommissionConfig history). 4 lines, one per product.

---

### 9.4 Calculator Result Charts

#### Module 1 — Forward Calculator Results Chart

**Library:** Recharts `BarChart` (grouped)

After calculation, render results panel with:

```
BarChart — "5-Year Income Projection"
data = [
  { year: 'Year 1', income: annualIncome[1] },
  { year: 'Year 2', income: annualIncome[2] },
  { year: 'Year 3', income: annualIncome[3] },
  { year: 'Year 4', income: annualIncome[4] },
  { year: 'Year 5', income: annualIncome[5] },
]
Bar fill: gradient from #003366 (year 1) to #a7c8ff (year 5)
Reference line: average annual income
Tooltip: formatted ₹ value + breakdown of new business income, renewal carry-forward, and annual bonus

Income rule:
- Year 1 = lowest
- Year 5 = highest
- Each year must be higher than the previous year because repeated annual production compounds with renewal carry-forward
```

Below the chart — summary cards:
- 💰 First Year Earnings
- 🔁 5-Year Renewal Income
- 📊 Total Cumulative Income
- 📈 Persistency Impact highlight

**Bulk mode adds:** per-policy breakdown table below the aggregate chart.

---

#### Module 3 — Simulation Module Results Chart

**Library:** Recharts `BarChart` (grouped, 2 bars per year)

```
data = chartData from Section 7 Module 3
Bar 1: Baseline issuance projection → color #795900 (amber-dark)
Bar 2: Condition-adjusted issuance projection → color #36B24E (green)
X-axis: Year 1–5
Y-axis: ₹ renewal income

Persistency prediction annotation shown from selected company condition
Tooltip: predicted persistency + projected renewal effect
```

Additional metric cards above chart:
- Selected Condition
- Predicted Persistency
- 5-Year Projected Renewal
- Max Year 5 Impact

---

#### Module 4 — MDRT Tracker Page

Reuses `MDRTRingChart` + adds:

**Timeline Projection Line Chart:**
```
Library: Recharts LineChart
data: daily cumulative premium (last 90 days + projected next 90 days)
Line 1: Actual cumulative → #001e40
Line 2: Required run rate → #36B24E dashed
Line 3: MDRT target horizontal → #BA1A1A dashed

Shaded region between actual and required: green if ahead, red if behind
ReferenceLine: vertical at today
Tooltip: date + actual + required + gap
```

Stat cards:
- YTD Premium Achieved
- MDRT Target
- Remaining Gap
- Estimated Qualification Date

---

#### Module 5 — Activity Predictor Results

**Funnel-style visualization:**

```
Library: Recharts custom (use BarChart in vertical layout)
Funnel stages:
  Meetings per Week → Prospects → Conversions → Policies

data = [
  { stage: 'Meetings / Week', value: meetingsPerWeek },
  { stage: 'Prospects', value: meetingsPerWeek × 0.7 },   // 70% qualify
  { stage: 'Proposals', value: expectedPolicies × 1.5 },
  { stage: 'Policies', value: expectedPolicies },
]

Each bar fills full width proportional to value
Color gradient: light → dark as funnel narrows
```

Result metric cards:
- Expected Monthly Policies
- Expected Monthly Premium
- Expected Monthly Incentive
- Projected MDRT Date (if sustained)

---

### 9.5 Admin — Agent Detail Page Charts

#### Chart — Agent Monthly Premium Timeline

**Library:** Recharts `BarChart`

Data: `monthlyTimeline` (12 months from `/api/admin/agents/:id`)

Same implementation as `MonthlyPremiumChart` but rendered in agent context.

#### Chart — Agent Product Mix Pie

Same as `ProductMixPieChart` using agent's policy data.

#### Chart — Agent Persistency Over Time

**Library:** Recharts `LineChart`

```
data = last 12 months: { month, activePolicies, totalPolicies, rate }
Line: persistency rate → #001e40
ReferenceLine: target threshold from CommissionConfig → #36B24E dashed
Area fill below threshold → red with low opacity
Tooltip: month + rate + vs target
```

---

### 9.6 Chart Shared Utilities

**`formatCurrency(value: number): string`**
```typescript
export const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
```

**`formatChartCurrency(value: number): string`** (abbreviated for chart axes)
```typescript
export const formatChartCurrency = (v: number) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)     return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
};
```

**Chart color constants:**
```typescript
export const CHART_COLORS = {
  primary:    '#001e40',
  container:  '#003366',
  light:      '#a7c8ff',
  amber:      '#FFBF00',
  green:      '#36B24E',
  red:        '#BA1A1A',
  outline:    '#737780',
  surface:    '#eeedf2',
};

export const PRODUCT_COLORS = {
  'Term Plan':     '#001e40',
  'Savings Plan':  '#FFBF00',
  'ULIP':          '#36B24E',
  'Endowment':     '#3a5f94',
};

export const STATUS_COLORS = {
  active:      '#36B24E',
  lapsed:      '#BA1A1A',
  surrendered: '#737780',
  qualified:   '#36B24E',
  'on-track':  '#FFBF00',
  'at-risk':   '#BA1A1A',
};
```

**Responsive chart wrapper:**
```tsx
// All charts wrapped in ResponsiveContainer
<ResponsiveContainer width="100%" height={height ?? 300}>
  {/* chart component */}
</ResponsiveContainer>
```

---

## 10. Calculator Modules UI

### Mode Toggle (Forward & Simulation)

```tsx
// At top of calculator page
<div className="flex p-1 bg-surface-container-low rounded-full w-fit">
  <button onClick={() => setMode('single')}
    className={mode === 'single' ? 'bg-primary text-white ...' : '...'}>
    Single Mode
  </button>
  <button onClick={() => setMode('bulk')}
    className={mode === 'bulk' ? 'bg-primary text-white ...' : '...'}>
    Bulk Mode
  </button>
</div>
```

### Forward Calculator Layout

```
┌────────────────────────────────────────────────────┐
│  [Mode Toggle: Single | Bulk] [Projection | 5 Year]│
├──────────────────────────┬─────────────────────────┤
│  Input Form (col-7)      │  Results Panel (col-5)  │
│  ─────────────────       │  ─────────────────────  │
│  Policies Sold           │  [Empty state until     │
│  Avg Annual Premium ₹    │   form submitted]       │
│  Product Type (select)   │                         │
│  Bonus Slab (select)     │  POST CALC:             │
│  Persistency Slider      │  - Progressive 5-Year   │
│                          │    income chart         │
│                          │  - 4 metric cards       │
│  [Calculate] [Reset]     │  - per-policy table     │
│                          │   (bulk mode only)      │
└──────────────────────────┴─────────────────────────┘
```

### Simulation Module Layout

```
┌────────────────────────────────────────────────────┐
│  [Condition Selector]                              │
├──────────────────┬─────────────────────────────────┤
│  Inputs (col-4)  │  Chart + Results (col-8)        │
│  ─────────────── │  ────────────────────────────── │
│  Select Condition│  [Projected Persistency card]   │
│  Product Type    │  [Projected Renewal chart]      │
│  Policies Sold   │  [Condition Impact card]        │
│  Avg Premium ₹   │  [3 insight cards below]        │
│  [Run Simulation]│                                 │
└──────────────────┴─────────────────────────────────┘
```

### MDRT Tracker Layout

```
┌─────────────────────────────────────────────────────┐
│  [MDRT Ring Chart — col-5]  [4 Stat Cards — col-7]  │
│   (radial bar with %)        YTD | Target |         │
│                              Remaining | Est. Date   │
├─────────────────────────────────────────────────────┤
│  [Timeline Projection Line Chart — full width]      │
│   (actual vs required run rate, shaded gap area)    │
└─────────────────────────────────────────────────────┘
```

### Activity Predictor Layout

```
┌──────────────────────────────────────────────────────┐
│  [Input sliders — col-4]  │  [Results — col-8]       │
│   Meetings / Week         │  [Funnel Chart]          │
│   Conversion Rate %       │  [3 metric cards]        │
│   Avg Premium / Sale ₹    │  [Impact Summary card]   │
│   Product Type            │                          │
│   [Apply]                 │                          │
└──────────────────────────────────────────────────────┘
```

---

## 11. Policy & Customer Management UI

### My Policies Page (`/policies`)

**Layout:**
```
Header: "Policy Management"  [Active Portfolio Value ₹X]  [New Sale button]

Stats Row:
  [Active Policies card]  [Pending Lapses card]  [Q4 Premium Target card + progress]

Filter Bar:
  [All Policies | Active | Lapsed | Surrendered]  [Search input]

Table:
  Policy Number | Customer Name | Product | Premium ₹ | Status Badge | Issue Date | ⋮

Pagination: Showing X of Y policies

[Charts section]:
  [Policy Status Donut — col-4]  [Product Mix Pie — col-8]
```

**Table row render:**
```typescript
// Status badge colors
const badgeColor = {
  active:      'bg-tertiary-container text-on-tertiary-fixed',
  lapsed:      'bg-error-container text-on-error-container',
  surrendered: 'bg-surface-container-highest text-on-surface-variant',
}
```

### Create Policy Page — Bulk Form

**Uses `useFieldArray` from React Hook Form:**

```tsx
const { control, register, handleSubmit, formState: { errors } } =
  useForm<BulkSaleFormValues>({
    resolver: zodResolver(bulkSaleFormSchema),
    defaultValues: { policies: [{}] },
  });

const { fields, append, remove } = useFieldArray({ control, name: 'policies' });

// Each field rendered as collapsible card:
// - Header shows: Policy N | Customer Name | Product | ₹Premium (once filled)
// - Collapsed = valid; Expanded = editing or has errors
// - Remove button (hidden when only 1 row)
// - Dynamic total in header: "Draft Total: ₹X"

// "Add Another Policy" button: disabled when fields.length === 20
// "Save N Policies" button: disabled until all fields pass Zod

// On submit: POST /api/policies/bulk
// On success: toast "N policies saved" → navigate to /policies
```

### Customer Detail Page

```
Breadcrumb: Customers > [Customer Name]

[Customer Profile Card — col-8]:
  photo (grayscale) | PAN | Mobile | Address | DOB
  Status badges: KYC Verified | HNI Segment

[Estimated Lifetime Value card — col-4]:
  ₹ lifetime value | Upsell progress bar

Stats Row (3 cards):
  Total Policies | Active Policies | Total Annual Premium

Policy Table: same as My Policies but filtered to this customer

[Product Mix Pie Chart for this customer]

[Add Policy for Customer CTA] → /policies/create?customerId=xxx
```

---

## 12. Admin Panel UI

### Agent Overview Page (`/agents`)

```
Header: "Agent Performance"  [Export CSV]  [Filter Bar]

Summary Stats:
  Total YTD Premium (all agents) | Avg Persistency | Qualified Count | At Risk Count

[MDRT Status Distribution Pie Chart — col-4]
[Branch Performance Bar Chart — col-8]

Agent Table:
  Name | EmpID | Branch | YTD Premium | Policies | Customers | Persistency % | MDRT Badge | ▶

Footer Row: Team totals
Pagination
```

**MDRT Badge:**
```typescript
const mdrtBadge = {
  qualified: 'bg-tertiary-container text-on-tertiary-fixed',   // green
  'on-track': 'bg-secondary-container text-on-secondary-container', // amber
  'at-risk':  'bg-error-container text-on-error-container',    // red
}
```

### Agent Detail Page (`/agents/:id`)

**3 tabs:**

**Tab 1 — Overview:**
```
[MDRT Ring Chart — col-4]
[4 Stat Cards — col-8]: YTD Premium | Policies | Persistency % | Customers

[Monthly Premium Bar Chart — full width] (12 months)
[Product Mix Pie — col-4] [Persistency Trend Line — col-8]
```

**Tab 2 — Policies:** Policy table (read-only for admin)

**Tab 3 — Customers:** Customer list (read-only for admin)

### Commission Config Page

```
Current Config:
  [Config-driven Slab Table]:
    Min Premium | Max Premium | Bonus Rate %
    (editable rows with + Add Slab button)

  Persistency Threshold: slider
  MDRT Target ₹: input
  Effective From: date picker

[Preview Diff Modal] before saving (shows before/after comparison)

History Section:
  [Commission Rate History Line Chart — full width]
    4 lines (one per product type), X-axis = effectiveFrom dates
    Y-axis = fyCommissionRate %
    Tooltip: exact rates at each config date
```

### Audit Logs Page

```
Filter Bar: [All Events | Configuration | Access Control | Commission] [Date Range]

[Log Integrity Widget] — 100% validated + last SHA-256 check timestamp

Logs Table:
  Timestamp | Action (color dot) | Performed By | Target Entity | [View Diff]

Action color dots:
  commission_config_updated → amber
  user_created / user_updated → green
  policy_created / deleted → blue
  Failed login → red

[View Diff] opens modal with before/after JSON diff

Pagination
```

---

## 13. API Routes Reference

```
# Auth
POST   /api/auth/login
POST   /api/auth/change-password                     [auth]

# Agent Dashboard
GET    /api/agent/dashboard                          [auth, role(agent,admin)]

# Calculators
POST   /api/calculator/forward                       [auth, role(agent)]
POST   /api/calculator/forward/bulk                  [auth, role(agent)]
POST   /api/calculator/reverse                       [auth, role(agent)]
POST   /api/calculator/simulation                    [auth, role(agent)]
GET    /api/calculator/mdrt                          [auth, role(agent)]
POST   /api/calculator/mdrt                          [auth, role(agent)]
POST   /api/calculator/activity                      [auth, role(agent)]

# Policies
POST   /api/policies/bulk                            [auth, role(agent)]
GET    /api/policies                                 [auth, role(agent)]
GET    /api/policies/:id                             [auth, role(agent)]
PATCH  /api/policies/:id/status                      [auth, role(agent)]
DELETE /api/policies/:id                             [auth, role(agent)]

# Customers
POST   /api/customers                                [auth, role(agent)]
GET    /api/customers                                [auth, role(agent)]
GET    /api/customers/:id                            [auth, role(agent)]
PATCH  /api/customers/:id                            [auth, role(agent)]

# Admin Dashboard
GET    /api/admin/dashboard                          [auth, role(admin)]

# Products
GET    /api/products                                 [auth]
GET    /api/products/:id                             [auth]
POST   /api/products                                 [auth, role(admin)]
PATCH  /api/products/:id                             [auth, role(admin)]

# Admin — Configs
GET    /api/admin/configs                            [auth, role(admin)]
PUT    /api/admin/configs                            [auth, role(admin)]

# Admin — Users
GET    /api/admin/users                              [auth, role(admin)]
POST   /api/admin/users                              [auth, role(admin)]
PATCH  /api/admin/users/:id                          [auth, role(admin)]

# Admin — Logs
GET    /api/admin/logs                               [auth, role(admin)]

# Admin — Agent Overview
GET    /api/admin/agents                             [auth, role(admin)]
GET    /api/admin/agents/:id                         [auth, role(admin)]
```

---

## 14. Edge Cases & Error Handling

### Global HTTP Error Codes

| Scenario | HTTP | `error.code` |
|---|---|---|
| Missing / malformed JWT | 401 | `MISSING_TOKEN` |
| Expired JWT | 401 | `TOKEN_EXPIRED` |
| Invalid JWT | 401 | `INVALID_TOKEN` |
| Role not permitted | 403 | `FORBIDDEN` |
| Zod validation failure | 400 | `VALIDATION_ERROR` |
| Resource not found | 404 | `NOT_FOUND` |
| Conflict (duplicate) | 409 | (specific codes below) |
| No active product config in DB | 500 | `CONFIG_MISSING` |

### Policy & Customer Edge Cases

| Scenario | HTTP | Code | Resolution |
|---|---|---|---|
| `policyHolderId` not owned by agent | 400 | `INVALID_CUSTOMER` | Ownership check before insert |
| `policyNumber` already exists | 409 | `POLICY_NUMBER_CONFLICT` | Unique index; error identifies which policies[N] caused it |
| `productId` inactive or not found | 400 | `INVALID_PRODUCT` | Active product check before insert |
| `premiumPayingTerm` > `policyTerm` | 400 | `VALIDATION_ERROR` | Zod refinement |
| Duplicate PAN for same agent | 409 | `DUPLICATE_PAN` | Compound unique index |
| `policies` array empty | 400 | `VALIDATION_ERROR` | Zod `.min(1)` |
| `policies` array > 20 | 400 | `VALIDATION_ERROR` | Zod `.max(20)` |
| Soft-deleted policy accessed | 404 | `NOT_FOUND` | Pre-find middleware |
| Deactivating last active admin | 409 | `LAST_ADMIN` | Count check before update |
| No active CommissionConfig | 500 | `CONFIG_MISSING` | Must seed config before going live |

### Bulk Sale Transaction Safety

```typescript
// Error response format when a specific policy fails
{
  "success": false,
  "error": {
    "code": "POLICY_NUMBER_CONFLICT",
    "message": "Policy number POL-12345 already exists",
    "details": { "policies.2.policyNumber": ["Policy number already exists"] }
  }
}
// → Entire MongoDB transaction rolled back, no partial saves
```

### Calculator Edge Cases

| Scenario | Behavior |
|---|---|
| `persistencyRate = 0` | All renewal income = 0; FYC still calculated |
| `persistencyRate = 1` | No decay; full renewal income all 5 years |
| `targetIncome` too high for any product | Return `requiredPolicies` with warning flag `{ unrealistic: true }` |
| No active product for given `productType` | HTTP 500 `CONFIG_MISSING` |
| `scenarioA_persistency === scenarioB_persistency` | HTTP 400 `VALIDATION_ERROR` |
| `meetingsPerWeek = 0` | HTTP 400 validation — min 1 |
| MDRT tracker with zero policies | `percentAchieved = 0`, `estimatedQualificationDate = null` |

### Chart Render Edge Cases

| Scenario | Behavior |
|---|---|
| All chart data values are 0 | Show empty state with "No data yet" message instead of chart |
| Dashboard API fails | Show `ErrorCard` with retry button; do not crash entire page |
| Forecast months have no data | Render dashed empty bars/lines with tooltip "Forecast" |
| Single data point in line chart | Render as dot + horizontal line; do not crash |
| `percentAchieved > 100` | Cap ring at 100%; show "Qualified ✓" overlay |

---

## 15. Non-Functional Requirements

| Requirement | Specification |
|---|---|
| Response Time | P95 of `/api/calculator/*` < 2,000ms; `/api/policies/bulk` < 3,000ms; dashboard charts < 1,500ms |
| Concurrency | Supports 100+ concurrent users |
| Transaction Safety | Bulk policy inserts use MongoDB sessions; no partial saves |
| Security | bcrypt ≥ 12; JWT RS256; TLS 1.2+; PAN masked in logs; no full Aadhaar stored |
| Encryption | MongoDB at-rest encryption; all traffic HTTPS |
| Availability | 99.5% uptime target |
| Scalability | Stateless backend; horizontal scaling ready |
| Auditability | 100% of admin config changes + policy creates/deletes logged with diff |
| TypeScript | Strict mode across all packages; no `any` |
| Validation | Zod as single source of truth — both frontend and backend |
| Module Pattern | Each backend module: exactly `model.ts`, `controller.ts`, `index.ts` |
| No Hardcoding | Zero commission/rate values in application code |
| PII Handling | Aadhaar: last 4 digits only; PAN stored as-is; masked in logs |
| Mobile Support | Fully functional at ≥ 375px (bottom tab bar on mobile) |
| Browser Support | Chrome 110+, Safari 16+, Edge 110+, Firefox 110+ |
| No Frontend Math | All financial calculations run server-side only |
| Chart Performance | Charts use `ResponsiveContainer`; data memoized with `useMemo` |
| Empty States | Every chart has a defined empty state (no blank containers) |

---

## 16. Out of Scope — Phase 1

| Feature | Reason |
|---|---|
| Real-time policy sync from core insurance system | External API integration not yet agreed |
| AI-based sales suggestions | Phase 2 ML initiative |
| Product recommendation engine | Requires customer profile + ML model |
| Gamification / leaderboard | Phase 2 engagement feature |
| WhatsApp reminder bot | Requires WhatsApp Business API agreement |
| Push notifications | Requires mobile app or PWA — Phase 2 |
| Document uploads (policy PDFs) | Requires S3 — Phase 2 |
| Customer e-KYC / Aadhaar verification | Requires UIDAI API — Phase 2 |
| Multi-branch admin drill-through | Phase 2 analytics |
| Chart export to PDF/PNG | Phase 2 reporting |
| Real-time WebSocket updates for dashboard | Phase 2 |

---

*End of Specification v5.0.0*
*Canara HSBC Life Insurance — Agent Incentive Platform*