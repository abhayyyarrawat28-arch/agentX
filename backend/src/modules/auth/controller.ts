import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../user/model';
import { AgentRegistration } from '../agent-registration/model';
import { AuditLog } from '../logs/model';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { sendNotification } from '../../utils/notificationService';
import { env } from '../../config/env';
import mongoose from 'mongoose';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { employeeId, password } = req.body;

    const user = await User.findOne({ employeeId, isActive: true });
    if (!user) {
      sendError(res, 'INVALID_CREDENTIALS', 'Invalid employee ID or password', 401);
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      sendError(res, 'INVALID_CREDENTIALS', 'Invalid employee ID or password', 401);
      return;
    }

    if (user.mustChangePassword) {
      const tempToken = jwt.sign(
        { sub: user._id.toString(), role: user.role, branchId: user.branchId },
        env.jwtSecret,
        { expiresIn: '15m' as any }
      );
      sendSuccess(res, {
        mustChangePassword: true,
        token: tempToken,
        role: user.role,
      });
      return;
    }

    const expiresIn = user.role === 'admin' ? env.jwtExpiresInAdmin : env.jwtExpiresInAgent;
    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role, branchId: user.branchId },
      env.jwtSecret,
      { expiresIn: expiresIn as any }
    );

    sendSuccess(res, {
      token,
      role: user.role,
      expiresIn,
      mustChangePassword: false,
      user: { name: user.name, employeeId: user.employeeId, branchId: user.branchId },
    });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Login failed', 500);
  }
}

export async function adminSignup(req: Request, res: Response): Promise<void> {
  try {
    const { employeeId, name, branchId, password } = req.body;
    const normalizedEmployeeId = employeeId.toUpperCase();

    const existingByEmployeeId = await User.findOne({ employeeId: normalizedEmployeeId });
    if (existingByEmployeeId) {
      sendError(res, 'EMPLOYEE_ID_TAKEN', 'Employee ID is already in use', 409);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await User.create({
      employeeId: normalizedEmployeeId,
      passwordHash,
      role: 'admin',
      name,
      branchId,
      isActive: true,
      mustChangePassword: false,
      onboardedBy: 'admin_created',
    });

    const token = jwt.sign(
      { sub: admin._id.toString(), role: admin.role, branchId: admin.branchId },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresInAdmin as any }
    );

    sendSuccess(res, {
      token,
      role: admin.role,
      expiresIn: env.jwtExpiresInAdmin,
      mustChangePassword: false,
      user: { name: admin.name, employeeId: admin.employeeId, branchId: admin.branchId },
    }, 201);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Admin signup failed', 500);
  }
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user!.sub);
    if (!user) {
      sendError(res, 'NOT_FOUND', 'User not found', 404);
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      sendError(res, 'INVALID_CREDENTIALS', 'Current password is incorrect', 401);
      return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    await user.save();

    const expiresIn = user.role === 'admin' ? env.jwtExpiresInAdmin : env.jwtExpiresInAgent;
    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role, branchId: user.branchId },
      env.jwtSecret,
      { expiresIn: expiresIn as any }
    );

    sendSuccess(res, { token, role: user.role, expiresIn, message: 'Password changed successfully' });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Password change failed', 500);
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body;

    // Check duplicate employeeId
    const existingUser = await User.findOne({ employeeId: data.employeeId.toUpperCase() });
    if (existingUser) {
      sendError(res, 'EMPLOYEE_ID_TAKEN', 'Employee ID is already in use', 409);
      return;
    }

    const pendingReg = await AgentRegistration.findOne({
      employeeId: data.employeeId.toUpperCase(),
      status: { $in: ['pending', 'approved'] },
    });
    if (pendingReg) {
      sendError(res, 'REGISTRATION_ALREADY_PENDING', 'A registration with this Employee ID is already pending or approved', 409);
      return;
    }

    // Check duplicate mobile
    const mobileTaken = await User.findOne({ employeeId: { $exists: true } }).then(() =>
      AgentRegistration.findOne({ mobile: data.mobile, status: { $in: ['pending', 'approved'] } })
    );
    if (mobileTaken) {
      sendError(res, 'MOBILE_TAKEN', 'Mobile number already registered', 409);
      return;
    }

    // Check duplicate email
    const emailTaken = await AgentRegistration.findOne({ email: data.email.toLowerCase(), status: { $in: ['pending', 'approved'] } });
    if (emailTaken) {
      sendError(res, 'EMAIL_TAKEN', 'Email address already registered', 409);
      return;
    }

    const registration = await AgentRegistration.create({
      ...data,
      employeeId: data.employeeId.toUpperCase(),
      email: data.email.toLowerCase(),
      panNumber: data.panNumber.toUpperCase(),
      status: 'pending',
    });

    await sendNotification({
      to: { email: data.email, mobile: data.mobile, name: data.fullName },
      type: 'registration_received',
      data: { registrationId: registration._id.toString() },
    });

    sendSuccess(res, {
      registrationId: registration._id.toString(),
      message: 'Your application has been submitted successfully and is under review.',
      status: 'pending',
    }, 201);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Registration failed', 500);
  }
}

export async function getRegistrationStatus(req: Request, res: Response): Promise<void> {
  try {
    const reg = await AgentRegistration.findById(req.params.registrationId);
    if (!reg) {
      sendError(res, 'NOT_FOUND', 'Registration not found', 404);
      return;
    }

    sendSuccess(res, {
      registrationId: reg._id.toString(),
      status: reg.status,
      submittedAt: reg.createdAt,
      reviewedAt: reg.reviewedAt,
      rejectionNote: reg.status === 'rejected' ? reg.rejectionNote : null,
    });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve registration status', 500);
  }
}

export async function listRegistrations(req: Request, res: Response): Promise<void> {
  try {
    const { status = 'pending', page = 1, limit = 20, search } = req.query as any;
    const filter: any = {};
    if (status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, items] = await Promise.all([
      AgentRegistration.countDocuments(filter),
      AgentRegistration.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    sendSuccess(res, items, 200, { page, limit, total });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to list registrations', 500);
  }
}

export async function getRegistrationDetail(req: Request, res: Response): Promise<void> {
  try {
    const reg = await AgentRegistration.findById(req.params.id);
    if (!reg) {
      sendError(res, 'NOT_FOUND', 'Registration not found', 404);
      return;
    }
    sendSuccess(res, reg);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve registration', 500);
  }
}

export async function approveRegistration(req: Request, res: Response): Promise<void> {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const registration = await AgentRegistration.findOne({ _id: req.params.id, status: 'pending' }).session(session);
    if (!registration) {
      await session.abortTransaction();
      sendError(res, 'NOT_FOUND', 'Pending registration not found', 404);
      return;
    }

    const existingUser = await User.findOne({ employeeId: registration.employeeId }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      sendError(res, 'EMPLOYEE_ID_TAKEN', 'Employee ID has been taken since registration', 409);
      return;
    }

    const temporaryPassword = crypto.randomUUID().slice(0, 12).toUpperCase();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const newUser = new User({
      employeeId: registration.employeeId,
      passwordHash,
      role: 'agent',
      name: registration.fullName,
      branchId: req.body.branchId || registration.branchId,
      isActive: true,
      mustChangePassword: true,
      registrationId: registration._id,
      onboardedBy: 'self_registration',
    });
    await newUser.save({ session });

    registration.status = 'approved';
    registration.reviewedBy = new mongoose.Types.ObjectId(req.user!.sub);
    registration.reviewedAt = new Date();
    registration.userId = newUser._id as mongoose.Types.ObjectId;
    await registration.save({ session });

    await session.commitTransaction();

    // Audit log (best effort, outside transaction)
    await AuditLog.create({
      action: 'user_created',
      performedBy: new mongoose.Types.ObjectId(req.user!.sub),
      targetId: newUser._id,
      diff: { before: {}, after: { employeeId: registration.employeeId, name: registration.fullName } },
    });

    await sendNotification({
      to: { email: registration.email, mobile: registration.mobile, name: registration.fullName },
      type: 'registration_approved',
      data: { employeeId: registration.employeeId, temporaryPassword },
    });

    sendSuccess(res, {
      userId: newUser._id.toString(),
      employeeId: registration.employeeId,
      message: 'Registration approved. Agent has been notified with login credentials.',
    });
  } catch (e) {
    await session.abortTransaction();
    sendError(res, 'INTERNAL_ERROR', 'Approval failed', 500);
  } finally {
    session.endSession();
  }
}

export async function rejectRegistration(req: Request, res: Response): Promise<void> {
  try {
    const registration = await AgentRegistration.findOne({ _id: req.params.id, status: 'pending' });
    if (!registration) {
      sendError(res, 'NOT_FOUND', 'Pending registration not found', 404);
      return;
    }

    registration.status = 'rejected';
    registration.rejectionNote = req.body.rejectionNote;
    registration.reviewedBy = new mongoose.Types.ObjectId(req.user!.sub);
    registration.reviewedAt = new Date();
    await registration.save();

    await AuditLog.create({
      action: 'registration_rejected',
      performedBy: new mongoose.Types.ObjectId(req.user!.sub),
      targetId: registration._id,
      diff: { before: {}, after: { rejectionNote: req.body.rejectionNote } },
    });

    await sendNotification({
      to: { email: registration.email, mobile: registration.mobile, name: registration.fullName },
      type: 'registration_rejected',
      data: { rejectionNote: req.body.rejectionNote },
    });

    sendSuccess(res, { message: 'Registration rejected. Agent has been notified.' });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Rejection failed', 500);
  }
}

export async function getRegistrationStats(req: Request, res: Response): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [pending, approved, rejected, todayNew, weekNew] = await Promise.all([
      AgentRegistration.countDocuments({ status: 'pending' }),
      AgentRegistration.countDocuments({ status: 'approved' }),
      AgentRegistration.countDocuments({ status: 'rejected' }),
      AgentRegistration.countDocuments({ createdAt: { $gte: today } }),
      AgentRegistration.countDocuments({ createdAt: { $gte: weekAgo } }),
    ]);

    const reviewedRegs = await AgentRegistration.find({
      status: { $in: ['approved', 'rejected'] },
      reviewedAt: { $ne: null },
    }).select('createdAt reviewedAt');

    let avgReviewTimeHours = 0;
    if (reviewedRegs.length > 0) {
      const totalHours = reviewedRegs.reduce((sum, r) => {
        return sum + ((r.reviewedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60));
      }, 0);
      avgReviewTimeHours = Math.round(totalHours / reviewedRegs.length);
    }

    sendSuccess(res, {
      pending,
      approved,
      rejected,
      total: pending + approved + rejected,
      todayNew,
      weekNew,
      avgReviewTimeHours,
    });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to get stats', 500);
  }
}
