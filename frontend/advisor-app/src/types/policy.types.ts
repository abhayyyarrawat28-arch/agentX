export interface PolicyHolder {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  panNumber: string;
  aadhaarLast4: string;
  mobile: string;
  email: string | null;
  address: { street: string; city: string; state: string; pincode: string };
  relationToProposer: string;
  totalActivePolicies: number;
  totalAnnualPremium: number;
  isActive: boolean;
}

export interface AgentPolicy {
  _id: string;
  agentId: string;
  policyHolderId: string | PolicyHolder;
  saleTransactionId: string;
  productId: string;
  productName: string;
  policyNumber: string;
  annualPremium: number;
  sumAssured: number;
  policyTerm: number;
  premiumPayingTerm: number;
  paymentFrequency: string;
  issueDate: string;
  maturityDate: string;
  persistencyStatus: 'active' | 'lapsed' | 'surrendered';
}

export interface Product {
  _id: string;
  name: string;
  fyCommissionRate: number;
  renewalRates: { year2: number; year3: number; year4: number; year5: number };
  isActive: boolean;
}
