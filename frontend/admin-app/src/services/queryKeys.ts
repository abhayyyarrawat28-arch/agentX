export const queryKeys = {
  adminDashboard: ['admin-dashboard'] as const,
  adminAgents: ['admin-agents'] as const,
  adminAgentDetail: (id: string) => ['admin-agent-detail', id] as const,
  adminRegistrationsList: ['admin-registrations', 'list'] as const,
  adminRegistrationsPendingCount: ['admin-registrations', 'pending-count'] as const,
  adminUsers: ['admin-users'] as const,
  adminLogs: (page: number, limit: number) => ['admin-logs', page, limit] as const,
  products: ['products'] as const,
  adminConfigs: ['admin-configs'] as const,
};
