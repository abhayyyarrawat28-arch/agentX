import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { env } from './config/env';
import { User } from './modules/user/model';
import { Product } from './modules/product/model';
import { CommissionConfig } from './modules/config/model';
import { PolicyHolder } from './modules/policy-holder/model';
import { AgentPolicy } from './modules/agent-policy/model';
import { AgentRegistration } from './modules/agent-registration/model';
import { AuditLog } from './modules/logs/model';

async function seed() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Product.deleteMany({});
  await CommissionConfig.deleteMany({});
  await PolicyHolder.deleteMany({});
  await AgentPolicy.deleteMany({});
  await AgentRegistration.deleteMany({});
  await AuditLog.deleteMany({});

  // Create admin user
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await User.create({
    employeeId: 'ADMIN001',
    passwordHash: adminHash,
    role: 'admin',
    name: 'System Admin',
    branchId: 'HQ',
    isActive: true,
    mustChangePassword: false,
    onboardedBy: 'admin_created',
  });
  console.log('Admin created: ADMIN001 / admin123');

  // Create sample agent
  const agentHash = await bcrypt.hash('agent123', 12);
  const agent = await User.create({
    employeeId: 'ADV001',
    passwordHash: agentHash,
    role: 'agent',
    name: 'Rahul Sharma',
    branchId: 'BR001',
    isActive: true,
    mustChangePassword: false,
    onboardedBy: 'admin_created',
  });
  console.log('Agent created: ADV001 / agent123');

  // Create products
  const products = await Product.insertMany([
    {
      name: 'Term Plan',
      fyCommissionRate: 0.35,
      renewalRates: { year2: 0.075, year3: 0.075, year4: 0.05, year5: 0.05 },
      isActive: true,
      effectiveFrom: new Date('2024-01-01'),
    },
    {
      name: 'Savings Plan',
      fyCommissionRate: 0.25,
      renewalRates: { year2: 0.05, year3: 0.05, year4: 0.05, year5: 0.05 },
      isActive: true,
      effectiveFrom: new Date('2024-01-01'),
    },
    {
      name: 'ULIP',
      fyCommissionRate: 0.15,
      renewalRates: { year2: 0.03, year3: 0.03, year4: 0.02, year5: 0.02 },
      isActive: true,
      effectiveFrom: new Date('2024-01-01'),
    },
    {
      name: 'Endowment',
      fyCommissionRate: 0.30,
      renewalRates: { year2: 0.06, year3: 0.06, year4: 0.04, year5: 0.04 },
      isActive: true,
      effectiveFrom: new Date('2024-01-01'),
    },
  ]);
  console.log(`Created ${products.length} products`);

  // Create commission config
  await CommissionConfig.create({
    slabs: [
      { minPremium: 0, maxPremium: 500000, bonusRate: 0 },
      { minPremium: 500000, maxPremium: 1500000, bonusRate: 0.05 },
      { minPremium: 1500000, maxPremium: 3000000, bonusRate: 0.08 },
      { minPremium: 3000000, maxPremium: null, bonusRate: 0.12 },
    ],
    persistencyThreshold: 0.85,
    mdrtTarget: 3000000,
    effectiveFrom: new Date('2024-01-01'),
    updatedBy: admin._id,
  });
  console.log('Commission config created');

  // Create sample customers and policies for the agent
  const { v4: uuidv4 } = await import('uuid');

  const customers = await PolicyHolder.insertMany([
    {
      agentId: agent._id,
      firstName: 'Priya',
      lastName: 'Patel',
      dateOfBirth: new Date('1985-06-15'),
      gender: 'female',
      panNumber: 'ABCPD1234E',
      aadhaarLast4: '1234',
      mobile: '9876543210',
      email: 'priya.patel@example.com',
      address: { street: '123 MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
      relationToProposer: 'self',
      totalActivePolicies: 0,
      totalAnnualPremium: 0,
    },
    {
      agentId: agent._id,
      firstName: 'Amit',
      lastName: 'Kumar',
      dateOfBirth: new Date('1990-03-22'),
      gender: 'male',
      panNumber: 'BCDPK5678F',
      aadhaarLast4: '5678',
      mobile: '9876543211',
      email: 'amit.kumar@example.com',
      address: { street: '456 Brigade Road', city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
      relationToProposer: 'self',
      totalActivePolicies: 0,
      totalAnnualPremium: 0,
    },
    {
      agentId: agent._id,
      firstName: 'Sneha',
      lastName: 'Gupta',
      dateOfBirth: new Date('1988-11-08'),
      gender: 'female',
      panNumber: 'CDEPG9012H',
      aadhaarLast4: '9012',
      mobile: '9876543212',
      email: 'sneha.gupta@example.com',
      address: { street: '789 Connaught Place', city: 'Delhi', state: 'Delhi', pincode: '110001' },
      relationToProposer: 'self',
      totalActivePolicies: 0,
      totalAnnualPremium: 0,
    },
  ]);
  console.log(`Created ${customers.length} customers`);

  // Create sample policies
  const saleId = uuidv4();
  const now = new Date();
  const samplePolicies = [
    {
      agentId: agent._id,
      policyHolderId: customers[0]._id,
      saleTransactionId: saleId,
      productId: products[0]._id,
      productName: 'Term Plan',
      policyNumber: 'POL-2026-001',
      annualPremium: 75000,
      sumAssured: 10000000,
      policyTerm: 20,
      premiumPayingTerm: 20,
      paymentFrequency: 'annual',
      issueDate: new Date(now.getFullYear(), now.getMonth() - 3, 15),
      maturityDate: new Date(now.getFullYear() + 20, now.getMonth() - 3, 15),
      persistencyStatus: 'active',
    },
    {
      agentId: agent._id,
      policyHolderId: customers[0]._id,
      saleTransactionId: saleId,
      productId: products[1]._id,
      productName: 'Savings Plan',
      policyNumber: 'POL-2026-002',
      annualPremium: 120000,
      sumAssured: 2000000,
      policyTerm: 15,
      premiumPayingTerm: 10,
      paymentFrequency: 'annual',
      issueDate: new Date(now.getFullYear(), now.getMonth() - 2, 10),
      maturityDate: new Date(now.getFullYear() + 15, now.getMonth() - 2, 10),
      persistencyStatus: 'active',
    },
    {
      agentId: agent._id,
      policyHolderId: customers[1]._id,
      saleTransactionId: uuidv4(),
      productId: products[2]._id,
      productName: 'ULIP',
      policyNumber: 'POL-2026-003',
      annualPremium: 200000,
      sumAssured: 3000000,
      policyTerm: 10,
      premiumPayingTerm: 5,
      paymentFrequency: 'semi-annual',
      issueDate: new Date(now.getFullYear(), now.getMonth() - 1, 5),
      maturityDate: new Date(now.getFullYear() + 10, now.getMonth() - 1, 5),
      persistencyStatus: 'active',
    },
    {
      agentId: agent._id,
      policyHolderId: customers[2]._id,
      saleTransactionId: uuidv4(),
      productId: products[3]._id,
      productName: 'Endowment',
      policyNumber: 'POL-2026-004',
      annualPremium: 150000,
      sumAssured: 5000000,
      policyTerm: 25,
      premiumPayingTerm: 20,
      paymentFrequency: 'annual',
      issueDate: new Date(now.getFullYear(), now.getMonth(), 1),
      maturityDate: new Date(now.getFullYear() + 25, now.getMonth(), 1),
      persistencyStatus: 'active',
    },
    {
      agentId: agent._id,
      policyHolderId: customers[1]._id,
      saleTransactionId: uuidv4(),
      productId: products[0]._id,
      productName: 'Term Plan',
      policyNumber: 'POL-2025-005',
      annualPremium: 50000,
      sumAssured: 7500000,
      policyTerm: 30,
      premiumPayingTerm: 30,
      paymentFrequency: 'annual',
      issueDate: new Date(now.getFullYear() - 1, 6, 15),
      maturityDate: new Date(now.getFullYear() + 29, 6, 15),
      persistencyStatus: 'lapsed',
    },
  ];

  await AgentPolicy.insertMany(samplePolicies);
  console.log(`Created ${samplePolicies.length} policies`);

  // Update customer denormalized fields
  for (const cust of customers) {
    const activePolicies = samplePolicies.filter(
      p => p.policyHolderId.toString() === cust._id.toString() && p.persistencyStatus === 'active'
    );
    await PolicyHolder.updateOne(
      { _id: cust._id },
      {
        totalActivePolicies: activePolicies.length,
        totalAnnualPremium: activePolicies.reduce((s, p) => s + p.annualPremium, 0),
      }
    );
  }

  console.log('\nSeed complete!');
  console.log('─────────────────────────────');
  console.log('Admin login:   ADMIN001 / admin123');
  console.log('Agent login:   ADV001 / agent123');
  console.log('─────────────────────────────');

  await mongoose.disconnect();
}

seed().catch(console.error);
