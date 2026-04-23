import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';

// Schemas
import { BulkSalePoliciesSchema, PolicyListQuerySchema, PolicyStatusUpdateSchema } from '../schemas/policy.schema';
import { CreatePolicyHolderSchema, UpdatePolicyHolderSchema, CustomerListQuerySchema } from '../schemas/customer.schema';
import { ForwardCalcSchema, ForwardCalcBulkSchema, ReverseCalcSchema, SimulationModuleSchema, SimulationModuleBulkSchema, MDRTTrackerSchema, ActivityPredictorSchema } from '../schemas/calculator.schema';
import { CommissionConfigSchema, AgentOverviewQuerySchema, CreateUserSchema, UpdateUserSchema, LoginSchema, ChangePasswordSchema, AdminSignupSchema, AgentRegistrationInputSchema, RegistrationApproveSchema, RegistrationRejectSchema, LogsQuerySchema, ProductCreateSchema, ProductUpdateSchema } from '../schemas/admin.schema';

// Controllers
import * as authController from '../modules/auth/controller';
import * as policyController from '../modules/agent-policy/controller';
import * as customerController from '../modules/policy-holder/controller';
import * as calculatorController from '../modules/calculator/controller';
import * as dashboardController from '../modules/dashboard/controller';
import * as adminDashboardController from '../modules/dashboard/adminController';
import * as userController from '../modules/user/controller';
import * as configController from '../modules/config/controller';
import * as productController from '../modules/product/controller';
import * as logController from '../modules/logs/controller';

const router = Router();

// ─── Auth ─────────────────────────────────────────────────
router.post('/auth/login', validate(LoginSchema), authController.login);
router.post('/auth/admin-signup', validate(AdminSignupSchema), authController.adminSignup);
router.post('/auth/change-password', authenticate, validate(ChangePasswordSchema), authController.changePassword);

// ─── Agent Self-Registration (Public) ─────────────────────
router.post('/auth/register', validate(AgentRegistrationInputSchema), authController.register);
router.get('/auth/register/status/:registrationId', authController.getRegistrationStatus);

// ─── Agent Dashboard ──────────────────────────────────────
router.get('/agent/dashboard', authenticate, requireRole('agent', 'admin'), dashboardController.agentDashboard);

// ─── Calculators ──────────────────────────────────────────
router.post('/calculator/forward', authenticate, requireRole('agent'), validate(ForwardCalcSchema), calculatorController.forwardCalculator);
router.post('/calculator/forward/bulk', authenticate, requireRole('agent'), validate(ForwardCalcBulkSchema), calculatorController.forwardCalculatorBulk);
router.post('/calculator/reverse', authenticate, requireRole('agent'), validate(ReverseCalcSchema), calculatorController.reverseCalculator);
router.get('/calculator/simulation/conditions', authenticate, requireRole('agent'), calculatorController.getSimulationConditions);
router.post('/calculator/simulation', authenticate, requireRole('agent'), validate(SimulationModuleSchema), calculatorController.persistencySimulator);
router.post('/calculator/simulation/bulk', authenticate, requireRole('agent'), validate(SimulationModuleBulkSchema), calculatorController.persistencySimulatorBulk);
router.get('/calculator/mdrt', authenticate, requireRole('agent'), calculatorController.mdrtTracker);
router.post('/calculator/mdrt', authenticate, requireRole('agent'), calculatorController.mdrtTracker);
router.post('/calculator/activity', authenticate, requireRole('agent'), validate(ActivityPredictorSchema), calculatorController.activityPredictor);

// ─── Policies ─────────────────────────────────────────────
router.post('/policies/bulk', authenticate, requireRole('agent'), validate(BulkSalePoliciesSchema), policyController.bulkCreatePolicies);
router.get('/policies', authenticate, requireRole('agent'), policyController.listPolicies);
router.get('/policies/:id', authenticate, requireRole('agent'), policyController.getPolicyById);
router.patch('/policies/:id/status', authenticate, requireRole('agent'), validate(PolicyStatusUpdateSchema), policyController.updatePolicyStatus);
router.delete('/policies/:id', authenticate, requireRole('agent'), policyController.deletePolicy);

// ─── Customers ────────────────────────────────────────────
router.post('/customers', authenticate, requireRole('agent'), validate(CreatePolicyHolderSchema), customerController.createCustomer);
router.get('/customers', authenticate, requireRole('agent'), customerController.listCustomers);
router.get('/customers/:id', authenticate, requireRole('agent'), customerController.getCustomerById);
router.patch('/customers/:id', authenticate, requireRole('agent'), validate(UpdatePolicyHolderSchema), customerController.updateCustomer);

// ─── Products ─────────────────────────────────────────────
router.get('/products', authenticate, productController.listProducts);
router.get('/products/:id', authenticate, productController.getProductById);
router.post('/products', authenticate, requireRole('admin'), validate(ProductCreateSchema), productController.createProduct);
router.patch('/products/:id', authenticate, requireRole('admin'), validate(ProductUpdateSchema), productController.updateProduct);

// ─── Admin Dashboard ──────────────────────────────────────
router.get('/admin/dashboard', authenticate, requireRole('admin'), dashboardController.adminDashboard);

// ─── Admin — Commission Config ────────────────────────────
router.get('/admin/configs', authenticate, requireRole('admin'), configController.getConfig);
router.put('/admin/configs', authenticate, requireRole('admin'), validate(CommissionConfigSchema), configController.updateConfig);

// ─── Admin — Users ────────────────────────────────────────
router.get('/admin/users', authenticate, requireRole('admin'), userController.listUsers);
router.post('/admin/users', authenticate, requireRole('admin'), validate(CreateUserSchema), userController.createUser);
router.patch('/admin/users/:id', authenticate, requireRole('admin'), validate(UpdateUserSchema), userController.updateUser);

// ─── Admin — Agent Registrations ──────────────────────────
router.get('/admin/registrations', authenticate, requireRole('admin'), authController.listRegistrations);
router.get('/admin/registrations/stats', authenticate, requireRole('admin'), authController.getRegistrationStats);
router.get('/admin/registrations/:id', authenticate, requireRole('admin'), authController.getRegistrationDetail);
router.post('/admin/registrations/:id/approve', authenticate, requireRole('admin'), validate(RegistrationApproveSchema), authController.approveRegistration);
router.post('/admin/registrations/:id/reject', authenticate, requireRole('admin'), validate(RegistrationRejectSchema), authController.rejectRegistration);

// ─── Admin — Logs ─────────────────────────────────────────
router.get('/admin/logs', authenticate, requireRole('admin'), logController.listLogs);

// ─── Admin — Agent Overview ───────────────────────────────
router.get('/admin/agents', authenticate, requireRole('admin'), adminDashboardController.agentOverview);
router.get('/admin/agents/:id', authenticate, requireRole('admin'), adminDashboardController.agentDetail);

export default router;
