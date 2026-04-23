import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { CommissionConfig } from './model';
import { AuditLog } from '../logs/model';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function getConfig(req: Request, res: Response): Promise<void> {
  try {
    const configs = await CommissionConfig.find()
      .sort({ effectiveFrom: -1 })
      .limit(10)
      .populate('updatedBy', 'name employeeId');

    sendSuccess(res, configs);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to get configs', 500);
  }
}

export async function updateConfig(req: Request, res: Response): Promise<void> {
  try {
    const { slabs, simulationConditions, persistencyThreshold, mdrtTarget, effectiveFrom } = req.body;

    // Set effectiveTo on current active config
    const currentConfig = await CommissionConfig.findOne({
      effectiveFrom: { $lte: new Date() },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gt: new Date() } }],
    }).sort({ effectiveFrom: -1 });

    const before = currentConfig ? currentConfig.toObject() : {};

    if (currentConfig) {
      currentConfig.effectiveTo = new Date(effectiveFrom);
      await currentConfig.save();
    }

    const newConfig = await CommissionConfig.create({
      slabs,
      simulationConditions,
      persistencyThreshold,
      mdrtTarget,
      effectiveFrom: new Date(effectiveFrom),
      updatedBy: new mongoose.Types.ObjectId(req.user!.sub),
    });

    await AuditLog.create({
      action: 'commission_config_updated',
      performedBy: new mongoose.Types.ObjectId(req.user!.sub),
      targetId: newConfig._id,
      diff: { before, after: newConfig.toObject() },
    });

    sendSuccess(res, newConfig);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to update config', 500);
  }
}
