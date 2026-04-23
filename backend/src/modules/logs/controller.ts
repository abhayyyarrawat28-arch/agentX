import { Request, Response } from 'express';
import { AuditLog } from './model';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function listLogs(req: Request, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, action, startDate, endDate } = req.query as any;
    const filter: any = {};

    if (action) filter.action = action;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .populate('performedBy', 'name employeeId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    sendSuccess(res, logs, 200, { page: Number(page), limit: Number(limit), total });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to list logs', 500);
  }
}
