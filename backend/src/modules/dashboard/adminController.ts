import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../user/model';
import { AgentPolicy } from '../agent-policy/model';
import { PolicyHolder } from '../policy-holder/model';
import { CommissionConfig } from '../config/model';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { startOfYear, monthsAgo, getMonthAbbr } from '../../utils/dateHelpers';

export async function agentOverview(req: Request, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, branchId, search, sortBy = 'ytdPremium', sortOrder = 'desc' } = req.query as any;
    const yearStart = startOfYear();

    const userFilter: any = { role: 'agent', isActive: true };
    if (branchId) userFilter.branchId = branchId;
    if (search) {
      userFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const [_totalAgents, agents] = await Promise.all([
      User.countDocuments(userFilter),
      User.find(userFilter).select('-passwordHash').lean(),
    ]);

    const config = await CommissionConfig.findOne({
      effectiveFrom: { $lte: new Date() },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gt: new Date() } }],
    }).sort({ effectiveFrom: -1 });
    const mdrtTarget = config?.mdrtTarget || 3000000;

    // Get performance data for all agents
    const agentIds = agents.map(a => a._id);

    const performance = await AgentPolicy.aggregate([
      { $match: { agentId: { $in: agentIds }, isDeleted: false } },
      {
        $group: {
          _id: '$agentId',
          ytdPremium: {
            $sum: { $cond: [{ $and: [{ $gte: ['$issueDate', yearStart] }, { $eq: ['$persistencyStatus', 'active'] }] }, '$annualPremium', 0] },
          },
          policyCount: { $sum: 1 },
          activePolicies: { $sum: { $cond: [{ $eq: ['$persistencyStatus', 'active'] }, 1, 0] } },
        },
      },
    ]);

    const customerCounts = await PolicyHolder.aggregate([
      { $match: { agentId: { $in: agentIds } } },
      { $group: { _id: '$agentId', count: { $sum: 1 } } },
    ]);

    const perfMap = new Map(performance.map((p: any) => [p._id.toString(), p]));
    const custMap = new Map(customerCounts.map((c: any) => [c._id.toString(), c.count]));

    let agentList = agents.map(a => {
      const perf = perfMap.get(a._id.toString()) || { ytdPremium: 0, policyCount: 0, activePolicies: 0 };
      const persistencyRate = perf.policyCount > 0 ? perf.activePolicies / perf.policyCount : 0;
      const percentAchieved = Math.min((perf.ytdPremium / mdrtTarget) * 100, 100);
      let mdrtStatus: string;
      if (percentAchieved >= 100) mdrtStatus = 'qualified';
      else if (percentAchieved >= 70) mdrtStatus = 'on-track';
      else mdrtStatus = 'at-risk';

      return {
        _id: a._id,
        name: a.name,
        employeeId: a.employeeId,
        branchId: a.branchId,
        ytdPremium: perf.ytdPremium,
        policyCount: perf.policyCount,
        activePolicies: perf.activePolicies,
        customerCount: custMap.get(a._id.toString()) || 0,
        persistencyRate: Math.round(persistencyRate * 100) / 100,
        percentAchieved: Math.round(percentAchieved * 100) / 100,
        mdrtStatus,
      };
    });

    // Apply mdrtStatus filter
    const { mdrtStatus } = req.query as any;
    if (mdrtStatus) {
      agentList = agentList.filter(a => a.mdrtStatus === mdrtStatus);
    }

    // Sort
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    agentList.sort((a: any, b: any) => ((a[sortBy] ?? 0) - (b[sortBy] ?? 0)) * sortDir);

    // Paginate
    const start = (page - 1) * limit;
    const paginatedList = agentList.slice(start, start + Number(limit));

    sendSuccess(res, paginatedList, 200, {
      page: Number(page),
      limit: Number(limit),
      total: agentList.length,
    });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to load agent overview', 500);
  }
}

export async function agentDetail(req: Request, res: Response): Promise<void> {
  try {
    const agent = await User.findOne({ _id: req.params.id, role: 'agent' }).select('-passwordHash');
    if (!agent) {
      sendError(res, 'NOT_FOUND', 'Agent not found', 404);
      return;
    }

    const yearStart = startOfYear();
    const agentId = agent._id;

    const [policies, customers, ytdResult, monthlyTimeline] = await Promise.all([
      AgentPolicy.find({ agentId })
        .populate('policyHolderId', 'firstName lastName mobile panNumber')
        .sort({ issueDate: -1 }),
      PolicyHolder.find({ agentId }).sort({ createdAt: -1 }),
      AgentPolicy.aggregate([
        { $match: { agentId: new mongoose.Types.ObjectId(agentId as any), issueDate: { $gte: yearStart }, persistencyStatus: 'active', isDeleted: false } },
        { $group: { _id: null, total: { $sum: '$annualPremium' }, count: { $sum: 1 } } },
      ]),
      AgentPolicy.aggregate([
        { $match: { agentId: new mongoose.Types.ObjectId(agentId as any), issueDate: { $gte: monthsAgo(12) }, isDeleted: false } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$issueDate' } }, premium: { $sum: '$annualPremium' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const config = await CommissionConfig.findOne({
      effectiveFrom: { $lte: new Date() },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gt: new Date() } }],
    }).sort({ effectiveFrom: -1 });

    const ytdPremium = ytdResult[0]?.total || 0;
    const policyCount = policies.length;
    const activePolicies = policies.filter(p => p.persistencyStatus === 'active').length;
    const persistencyRate = policyCount > 0 ? activePolicies / policyCount : 0;
    const mdrtTarget = config?.mdrtTarget || 3000000;
    const percentAchieved = Math.min((ytdPremium / mdrtTarget) * 100, 100);

    let mdrtStatus: string;
    if (percentAchieved >= 100) mdrtStatus = 'qualified';
    else if (percentAchieved >= 70) mdrtStatus = 'on-track';
    else mdrtStatus = 'at-risk';

    sendSuccess(res, {
      agent,
      performance: {
        ytdPremium,
        policyCount,
        activePolicies,
        persistencyRate: Math.round(persistencyRate * 100) / 100,
        customerCount: customers.length,
        mdrtTarget,
        percentAchieved: Math.round(percentAchieved * 100) / 100,
        mdrtStatus,
      },
      policies,
      customers,
      monthlyTimeline: monthlyTimeline.map((r: any) => ({ month: r._id, premium: r.premium })),
    });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to load agent detail', 500);
  }
}
