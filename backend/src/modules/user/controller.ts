import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { User } from '../user/model';
import { AuditLog } from '../logs/model';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, role, search } = req.query as any;
    const filter: any = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    sendSuccess(res, users, 200, { page: Number(page), limit: Number(limit), total });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to list users', 500);
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const { employeeId, name, role, branchId, password } = req.body;

    const existing = await User.findOne({ employeeId });
    if (existing) {
      sendError(res, 'EMPLOYEE_ID_TAKEN', 'Employee ID already exists', 409);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      employeeId,
      passwordHash,
      role,
      name,
      branchId,
      isActive: true,
      mustChangePassword: true,
      onboardedBy: 'admin_created',
    });

    await AuditLog.create({
      action: 'user_created',
      performedBy: new mongoose.Types.ObjectId(req.user!.sub),
      targetId: user._id,
      diff: { before: {}, after: { employeeId, name, role, branchId } },
    });

    const { passwordHash: _, ...userObj } = user.toObject();
    sendSuccess(res, userObj, 201);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to create user', 500);
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      sendError(res, 'NOT_FOUND', 'User not found', 404);
      return;
    }

    // Prevent deactivating last admin
    if (req.body.isActive === false && user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        sendError(res, 'LAST_ADMIN', 'Cannot deactivate the last admin', 409);
        return;
      }
    }

    const before = { name: user.name, branchId: user.branchId, isActive: user.isActive };

    if (req.body.name) user.name = req.body.name;
    if (req.body.branchId) user.branchId = req.body.branchId;
    if (req.body.isActive !== undefined) user.isActive = req.body.isActive;

    await user.save();

    await AuditLog.create({
      action: 'user_updated',
      performedBy: new mongoose.Types.ObjectId(req.user!.sub),
      targetId: user._id,
      diff: { before, after: { name: user.name, branchId: user.branchId, isActive: user.isActive } },
    });

    const { passwordHash: _, ...userObj } = user.toObject();
    sendSuccess(res, userObj);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to update user', 500);
  }
}
