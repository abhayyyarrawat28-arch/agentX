import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Product } from './model';
import { AuditLog } from '../logs/model';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function listProducts(req: Request, res: Response): Promise<void> {
  try {
    const products = await Product.find().sort({ name: 1, effectiveFrom: -1 });
    sendSuccess(res, products);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to list products', 500);
  }
}

export async function getProductById(req: Request, res: Response): Promise<void> {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      sendError(res, 'NOT_FOUND', 'Product not found', 404);
      return;
    }
    sendSuccess(res, product);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to get product', 500);
  }
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await Product.create({
      ...req.body,
      effectiveFrom: new Date(req.body.effectiveFrom),
      isActive: true,
    });

    sendSuccess(res, product, 201);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to create product', 500);
  }
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      sendError(res, 'NOT_FOUND', 'Product not found', 404);
      return;
    }

    const before = product.toObject();

    if (req.body.fyCommissionRate !== undefined) product.fyCommissionRate = req.body.fyCommissionRate;
    if (req.body.renewalRates) product.renewalRates = req.body.renewalRates;
    if (req.body.isActive !== undefined) product.isActive = req.body.isActive;

    await product.save();

    await AuditLog.create({
      action: 'product_updated',
      performedBy: new mongoose.Types.ObjectId(req.user!.sub),
      targetId: product._id,
      diff: { before, after: product.toObject() },
    });

    sendSuccess(res, product);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to update product', 500);
  }
}
