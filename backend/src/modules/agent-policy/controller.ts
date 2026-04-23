import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { AgentPolicy } from './model';
import { PolicyHolder } from '../policy-holder/model';
import { Product } from '../product/model';
import { AuditLog } from '../logs/model';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { addYears } from '../../utils/dateHelpers';

export async function bulkCreatePolicies(req: Request, res: Response): Promise<void> {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { policies } = req.body;
    const agentId = req.user!.sub;

    // Verify all policyHolderIds belong to agent
    const holderIds = [...new Set(policies.map((p: any) => p.policyHolderId))];
    const holders = await PolicyHolder.find({
      _id: { $in: holderIds },
      agentId,
    }).session(session);
    if (holders.length !== holderIds.length) {
      await session.abortTransaction();
      sendError(res, 'INVALID_CUSTOMER', 'One or more customers do not belong to you', 400);
      return;
    }

    // Check duplicate policy numbers
    const policyNumbers = policies.map((p: any) => p.policyNumber);
    const existing = await AgentPolicy.find({ policyNumber: { $in: policyNumbers } }).session(session);
    if (existing.length > 0) {
      await session.abortTransaction();
      sendError(res, 'POLICY_NUMBER_CONFLICT', `Policy number ${existing[0].policyNumber} already exists`, 409);
      return;
    }

    // Verify all productIds are active
    const productIds = [...new Set(policies.map((p: any) => p.productId))];
    const products = await Product.find({ _id: { $in: productIds }, isActive: true }).session(session);
    if (products.length !== productIds.length) {
      await session.abortTransaction();
      sendError(res, 'INVALID_PRODUCT', 'One or more products are invalid or inactive', 400);
      return;
    }

    // Validate premiumPayingTerm <= policyTerm
    for (let i = 0; i < policies.length; i++) {
      if (policies[i].premiumPayingTerm > policies[i].policyTerm) {
        await session.abortTransaction();
        sendError(res, 'VALIDATION_ERROR', `Policy ${i}: premiumPayingTerm exceeds policyTerm`, 400);
        return;
      }
    }

    const saleTransactionId = uuidv4();
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    const policyDocs = policies.map((p: any) => ({
      agentId: new mongoose.Types.ObjectId(agentId),
      policyHolderId: new mongoose.Types.ObjectId(p.policyHolderId),
      saleTransactionId,
      productId: new mongoose.Types.ObjectId(p.productId),
      productName: productMap.get(p.productId)?.name || p.productType,
      policyNumber: p.policyNumber,
      annualPremium: p.annualPremium,
      sumAssured: p.sumAssured,
      policyTerm: p.policyTerm,
      premiumPayingTerm: p.premiumPayingTerm,
      paymentFrequency: p.paymentFrequency || 'annual',
      issueDate: new Date(p.issueDate),
      maturityDate: addYears(new Date(p.issueDate), p.policyTerm),
      persistencyStatus: 'active',
      isDeleted: false,
    }));

    const created = await AgentPolicy.insertMany(policyDocs, { session });

    // Update PolicyHolder denormalized fields
    const holderUpdates: Record<string, { count: number; premium: number }> = {};
    for (const p of policies) {
      if (!holderUpdates[p.policyHolderId]) holderUpdates[p.policyHolderId] = { count: 0, premium: 0 };
      holderUpdates[p.policyHolderId].count += 1;
      holderUpdates[p.policyHolderId].premium += p.annualPremium;
    }

    for (const [holderId, update] of Object.entries(holderUpdates)) {
      await PolicyHolder.updateOne(
        { _id: holderId },
        { $inc: { totalActivePolicies: update.count, totalAnnualPremium: update.premium } },
        { session }
      );
    }

    await session.commitTransaction();

    // Audit log
    await AuditLog.create({
      action: 'policy_created',
      performedBy: new mongoose.Types.ObjectId(agentId),
      targetId: created[0]._id,
      diff: { before: {}, after: { saleTransactionId, count: created.length } },
    });

    sendSuccess(res, { saleTransactionId, policies: created }, 201);
  } catch (e) {
    await session.abortTransaction();
    sendError(res, 'INTERNAL_ERROR', 'Failed to create policies', 500);
  } finally {
    session.endSession();
  }
}

export async function listPolicies(req: Request, res: Response): Promise<void> {
  try {
    const agentId = req.user!.sub;
    const { page = 1, limit = 20, status, productType, policyHolderId, sortBy = 'issueDate', sortOrder = 'desc', search } = req.query as any;

    const filter: any = { agentId };
    if (status) filter.persistencyStatus = status;
    if (productType) filter.productName = productType;
    if (policyHolderId) filter.policyHolderId = policyHolderId;
    if (search) {
      filter.$or = [
        { policyNumber: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
      ];
    }

    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [total, policies] = await Promise.all([
      AgentPolicy.countDocuments(filter),
      AgentPolicy.find(filter)
        .populate('policyHolderId', 'firstName lastName mobile panNumber')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    sendSuccess(res, policies, 200, { page: Number(page), limit: Number(limit), total });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to list policies', 500);
  }
}

export async function getPolicyById(req: Request, res: Response): Promise<void> {
  try {
    const policy = await AgentPolicy.findOne({ _id: req.params.id, agentId: req.user!.sub })
      .populate('policyHolderId', 'firstName lastName mobile panNumber email address');
    if (!policy) {
      sendError(res, 'NOT_FOUND', 'Policy not found', 404);
      return;
    }
    sendSuccess(res, policy);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to get policy', 500);
  }
}

export async function updatePolicyStatus(req: Request, res: Response): Promise<void> {
  try {
    const policy = await AgentPolicy.findOne({ _id: req.params.id, agentId: req.user!.sub });
    if (!policy) {
      sendError(res, 'NOT_FOUND', 'Policy not found', 404);
      return;
    }

    const oldStatus = policy.persistencyStatus;
    policy.persistencyStatus = req.body.status;
    await policy.save();

    // Update PolicyHolder denormalized counts if status changed to/from active
    if (oldStatus === 'active' && req.body.status !== 'active') {
      await PolicyHolder.updateOne(
        { _id: policy.policyHolderId },
        { $inc: { totalActivePolicies: -1, totalAnnualPremium: -policy.annualPremium } }
      );
    } else if (oldStatus !== 'active' && req.body.status === 'active') {
      await PolicyHolder.updateOne(
        { _id: policy.policyHolderId },
        { $inc: { totalActivePolicies: 1, totalAnnualPremium: policy.annualPremium } }
      );
    }

    sendSuccess(res, policy);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to update policy status', 500);
  }
}

export async function deletePolicy(req: Request, res: Response): Promise<void> {
  try {
    const policy = await AgentPolicy.findOne({ _id: req.params.id, agentId: req.user!.sub });
    if (!policy) {
      sendError(res, 'NOT_FOUND', 'Policy not found', 404);
      return;
    }

    policy.isDeleted = true;
    policy.deletedAt = new Date();
    await policy.save();

    if (policy.persistencyStatus === 'active') {
      await PolicyHolder.updateOne(
        { _id: policy.policyHolderId },
        { $inc: { totalActivePolicies: -1, totalAnnualPremium: -policy.annualPremium } }
      );
    }

    await AuditLog.create({
      action: 'policy_deleted',
      performedBy: new mongoose.Types.ObjectId(req.user!.sub),
      targetId: policy._id,
      diff: { before: { policyNumber: policy.policyNumber }, after: { isDeleted: true } },
    });

    sendSuccess(res, { message: 'Policy deleted' });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to delete policy', 500);
  }
}
