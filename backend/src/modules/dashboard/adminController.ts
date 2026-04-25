import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../user/model';
import { AgentPolicy } from '../agent-policy/model';
import { PolicyHolder } from '../policy-holder/model';
import { CommissionConfig } from '../config/model';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { startOfYear, monthsAgo, getMonthAbbr } from '../../utils/dateHelpers';
import { getCached, setCached, serializeQuery } from '../../utils/ttlCache';
import { logger } from '../../utils/logger';

function shouldProfile(req: Request): boolean {
  return req.query.profile === '1';
}

function logProfile(endpoint: string, requestId: string | undefined, totalMs: number, timings: Record<string, number>): void {
  logger.info(`[profile] ${endpoint} ${totalMs}ms`, {
    requestId,
    endpoint,
    totalMs,
    timings,
  });
}

export async function agentOverview(req: Request, res: Response): Promise<void> {
  try {
    const profileEnabled = shouldProfile(req);
    const requestStart = Date.now();
    const timings: Record<string, number> = {};
    const timed = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      const start = Date.now();
      const result = await fn();
      timings[name] = Date.now() - start;
      return result;
    };

    const cacheKey = `admin-agent-overview:${serializeQuery(req.query as Record<string, unknown>)}`;
    const cacheStart = Date.now();
    const cached = getCached<{ data: any[]; meta: { page: number; limit: number; total: number } }>(cacheKey);
    timings.cacheLookup = Date.now() - cacheStart;
    if (cached) {
      if (profileEnabled) {
        logProfile('adminAgentOverview', req.requestId, Date.now() - requestStart, {
          ...timings,
          cacheHit: 1,
        });
      }
      sendSuccess(res, cached.data, 200, cached.meta);
      return;
    }

    const { page = 1, limit = 20, branchId, search, sortBy = 'ytdPremium', sortOrder = 'desc' } = req.query as any;
    const yearStart = startOfYear();
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNumber - 1) * limitNumber;

    const userFilter: any = { role: 'agent', isActive: true };
    if (branchId) userFilter.branchId = branchId;
    if (search) {
      userFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const config = await timed('activeConfigQuery', () => CommissionConfig.findOne({
      effectiveFrom: { $lte: new Date() },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gt: new Date() } }],
    }).sort({ effectiveFrom: -1 }));
    const mdrtTarget = config?.mdrtTarget || 3000000;

    const sortFieldMap: Record<string, string> = {
      name: 'name',
      employeeId: 'employeeId',
      branchId: 'branchId',
      ytdPremium: 'ytdPremium',
      policyCount: 'policyCount',
      activePolicies: 'activePolicies',
      customerCount: 'customerCount',
      persistencyRate: 'persistencyRate',
      percentAchieved: 'percentAchieved',
    };
    const safeSortBy = sortFieldMap[String(sortBy)] || 'ytdPremium';
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    const pipeline: any[] = [
      { $match: userFilter },
      {
        $lookup: {
          from: 'agentpolicies',
          let: { agentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$agentId', '$$agentId'] },
                    { $eq: ['$isDeleted', false] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                ytdPremium: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gte: ['$issueDate', yearStart] },
                          { $eq: ['$persistencyStatus', 'active'] },
                        ],
                      },
                      '$annualPremium',
                      0,
                    ],
                  },
                },
                policyCount: { $sum: 1 },
                activePolicies: {
                  $sum: { $cond: [{ $eq: ['$persistencyStatus', 'active'] }, 1, 0] },
                },
              },
            },
          ],
          as: 'performance',
        },
      },
      {
        $lookup: {
          from: 'policyholders',
          let: { agentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$agentId', '$$agentId'] },
              },
            },
            {
              $count: 'count',
            },
          ],
          as: 'customerStats',
        },
      },
      {
        $addFields: {
          ytdPremium: { $ifNull: [{ $arrayElemAt: ['$performance.ytdPremium', 0] }, 0] },
          policyCount: { $ifNull: [{ $arrayElemAt: ['$performance.policyCount', 0] }, 0] },
          activePolicies: { $ifNull: [{ $arrayElemAt: ['$performance.activePolicies', 0] }, 0] },
          customerCount: { $ifNull: [{ $arrayElemAt: ['$customerStats.count', 0] }, 0] },
        },
      },
      {
        $addFields: {
          persistencyRate: {
            $cond: [
              { $gt: ['$policyCount', 0] },
              { $divide: ['$activePolicies', '$policyCount'] },
              0,
            ],
          },
          percentAchieved: {
            $min: [
              { $multiply: [{ $divide: ['$ytdPremium', mdrtTarget] }, 100] },
              100,
            ],
          },
        },
      },
      {
        $addFields: {
          mdrtStatus: {
            $switch: {
              branches: [
                { case: { $gte: ['$percentAchieved', 100] }, then: 'qualified' },
                { case: { $gte: ['$percentAchieved', 70] }, then: 'on-track' },
              ],
              default: 'at-risk',
            },
          },
        },
      },
    ];

    const { mdrtStatus } = req.query as any;
    if (mdrtStatus) {
      pipeline.push({ $match: { mdrtStatus } });
    }

    pipeline.push(
      { $sort: { [safeSortBy]: sortDir, _id: 1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limitNumber },
            {
              $project: {
                _id: 1,
                name: 1,
                employeeId: 1,
                branchId: 1,
                ytdPremium: 1,
                policyCount: 1,
                activePolicies: 1,
                customerCount: 1,
                persistencyRate: 1,
                percentAchieved: 1,
                mdrtStatus: 1,
              },
            },
          ],
          meta: [{ $count: 'total' }],
        },
      },
    );

    const [result] = await timed('agentOverviewAggregate', () => User.aggregate(pipeline));

    const computeStart = Date.now();
    const paginatedList = (result?.data || []).map((item: any) => ({
      ...item,
      persistencyRate: Math.round((item.persistencyRate || 0) * 100) / 100,
      percentAchieved: Math.round((item.percentAchieved || 0) * 100) / 100,
    }));
    const total = result?.meta?.[0]?.total || 0;

    const meta = {
      page: pageNumber,
      limit: limitNumber,
      total,
    };

    timings.computeAndAssemble = Date.now() - computeStart;

    const cacheSetStart = Date.now();
    setCached(cacheKey, { data: paginatedList, meta }, 30 * 1000);
    timings.cacheSet = Date.now() - cacheSetStart;

    if (profileEnabled) {
      logProfile('adminAgentOverview', req.requestId, Date.now() - requestStart, {
        ...timings,
        cacheHit: 0,
      });
    }

    sendSuccess(res, paginatedList, 200, meta);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to load agent overview', 500);
  }
}

export async function agentDetail(req: Request, res: Response): Promise<void> {
  try {
    const profileEnabled = shouldProfile(req);
    const requestStart = Date.now();
    const timings: Record<string, number> = {};
    const timed = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      const start = Date.now();
      const result = await fn();
      timings[name] = Date.now() - start;
      return result;
    };

    const cacheKey = `admin-agent-detail:${req.params.id}`;
    const cacheStart = Date.now();
    const cached = getCached<any>(cacheKey);
    timings.cacheLookup = Date.now() - cacheStart;
    if (cached) {
      if (profileEnabled) {
        logProfile('adminAgentDetail', req.requestId, Date.now() - requestStart, {
          ...timings,
          cacheHit: 1,
        });
      }
      sendSuccess(res, cached);
      return;
    }

    const agent = await timed('agentLookupQuery', () => User.findOne({ _id: req.params.id, role: 'agent' }).select('-passwordHash'));
    if (!agent) {
      sendError(res, 'NOT_FOUND', 'Agent not found', 404);
      return;
    }

    const yearStart = startOfYear();
    const agentId = agent._id;

    const [policies, customers, ytdResult, monthlyTimeline] = await Promise.all([
      timed('policiesQuery', () => AgentPolicy.find({ agentId })
        .populate('policyHolderId', 'firstName lastName mobile panNumber')
        .sort({ issueDate: -1 })),
      timed('customersQuery', () => PolicyHolder.find({ agentId }).sort({ createdAt: -1 })),
      timed('ytdAggregate', () => AgentPolicy.aggregate([
        { $match: { agentId: new mongoose.Types.ObjectId(agentId as any), issueDate: { $gte: yearStart }, persistencyStatus: 'active', isDeleted: false } },
        { $group: { _id: null, total: { $sum: '$annualPremium' }, count: { $sum: 1 } } },
      ])),
      timed('monthlyTimelineAggregate', () => AgentPolicy.aggregate([
        { $match: { agentId: new mongoose.Types.ObjectId(agentId as any), issueDate: { $gte: monthsAgo(12) }, isDeleted: false } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$issueDate' } }, premium: { $sum: '$annualPremium' } } },
        { $sort: { _id: 1 } },
      ])),
    ]);

    const config = await timed('activeConfigQuery', () => CommissionConfig.findOne({
      effectiveFrom: { $lte: new Date() },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gt: new Date() } }],
    }).sort({ effectiveFrom: -1 }));

    const computeStart = Date.now();
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

    const payload = {
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
    };

    timings.computeAndAssemble = Date.now() - computeStart;

    const cacheSetStart = Date.now();
    setCached(cacheKey, payload, 30 * 1000);
    timings.cacheSet = Date.now() - cacheSetStart;

    if (profileEnabled) {
      logProfile('adminAgentDetail', req.requestId, Date.now() - requestStart, {
        ...timings,
        cacheHit: 0,
      });
    }

    sendSuccess(res, payload);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to load agent detail', 500);
  }
}
