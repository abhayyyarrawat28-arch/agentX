import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { PolicyHolder } from './model';
import { AgentPolicy } from '../agent-policy/model';
import { AuditLog } from '../logs/model';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function createCustomer(req: Request, res: Response): Promise<void> {
  try {
    const agentId = req.user!.sub;

    const existing = await PolicyHolder.findOne({ agentId, panNumber: req.body.panNumber });
    if (existing) {
      sendError(res, 'DUPLICATE_PAN', 'Customer with this PAN already exists', 409);
      return;
    }

    const customer = await PolicyHolder.create({
      ...req.body,
      agentId: new mongoose.Types.ObjectId(agentId),
      dateOfBirth: new Date(req.body.dateOfBirth),
      monthlyRenewalAmount: req.body.fixedMonthlyReturn ? (req.body.monthlyRenewalAmount ?? null) : null,
    });

    await AuditLog.create({
      action: 'customer_created',
      performedBy: new mongoose.Types.ObjectId(agentId),
      targetId: customer._id,
      diff: { before: {}, after: { firstName: customer.firstName, lastName: customer.lastName, panNumber: customer.panNumber } },
    });

    sendSuccess(res, customer, 201);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to create customer', 500);
  }
}

export async function listCustomers(req: Request, res: Response): Promise<void> {
  try {
    const agentId = req.user!.sub;
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query as any;

    const filter: any = { agentId };
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search } },
        { panNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [total, customers] = await Promise.all([
      PolicyHolder.countDocuments(filter),
      PolicyHolder.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    ]);

    sendSuccess(res, customers, 200, { page: Number(page), limit: Number(limit), total });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to list customers', 500);
  }
}

export async function getCustomerById(req: Request, res: Response): Promise<void> {
  try {
    const customer = await PolicyHolder.findOne({ _id: req.params.id, agentId: req.user!.sub });
    if (!customer) {
      sendError(res, 'NOT_FOUND', 'Customer not found', 404);
      return;
    }

    const policies = await AgentPolicy.find({ policyHolderId: customer._id }).sort({ issueDate: -1 });

    const activePolicies = policies.filter(p => p.persistencyStatus === 'active');
    const productCounts: Record<string, number> = {};
    policies.forEach(p => {
      productCounts[p.productName] = (productCounts[p.productName] || 0) + 1;
    });

    const summary = {
      totalPolicies: policies.length,
      activePolicies: activePolicies.length,
      totalAnnualPremium: activePolicies.reduce((sum, p) => sum + p.annualPremium, 0),
      productBreakdown: Object.entries(productCounts).map(([name, count]) => ({ name, count })),
    };

    sendSuccess(res, { customer, policies, summary });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to get customer', 500);
  }
}

export async function updateCustomer(req: Request, res: Response): Promise<void> {
  try {
    const customer = await PolicyHolder.findOne({ _id: req.params.id, agentId: req.user!.sub });
    if (!customer) {
      sendError(res, 'NOT_FOUND', 'Customer not found', 404);
      return;
    }

    const allowed = ['mobile', 'email', 'address', 'relationToProposer', 'isPriorityCustomer', 'fixedMonthlyReturn', 'monthlyRenewalAmount'];
    for (const key of Object.keys(req.body)) {
      if (allowed.includes(key)) {
        (customer as any)[key] = req.body[key];
      }
    }
    if (!customer.fixedMonthlyReturn) {
      customer.monthlyRenewalAmount = null;
    }
    await customer.save();

    sendSuccess(res, customer);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to update customer', 500);
  }
}
