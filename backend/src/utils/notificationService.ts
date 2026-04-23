import { logger } from './logger';

interface NotificationPayload {
  to: { email: string; mobile: string; name: string };
  type: 'registration_received' | 'registration_approved' | 'registration_rejected';
  data: Record<string, string>;
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  // Phase 1: Log notifications to console
  // Phase 2: Integrate with SendGrid (email) + MSG91 (SMS)
  const templates: Record<string, string> = {
    registration_received: `Application Received — Your registration is under review. Track ID: ${payload.data.registrationId}`,
    registration_approved: `Account Approved — EmpID: ${payload.data.employeeId}, TempPwd: ${payload.data.temporaryPassword}. Login and change your password.`,
    registration_rejected: `Application Update — Your registration was not approved. Reason: ${payload.data.rejectionNote}`,
  };

  logger.info('NOTIFICATION', {
    to: payload.to.email,
    type: payload.type,
    message: templates[payload.type],
  });
}
