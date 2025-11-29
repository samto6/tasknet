import 'server-only';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM || 'noreply@example.com';

function getResend() {
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }
  return new Resend(resendApiKey);
}

export async function sendMention(to: string, payload: { taskId: string; body: string }) {
  const resend = getResend();
  await resend.emails.send({
    from: fromEmail,
    to,
    subject: `You were mentioned on TaskNet (task ${payload.taskId})`,
    text: `A teammate mentioned you in a comment:\n\n${payload.body}\n\nOpen the task in TaskNet to reply.`,
  });
}

export async function sendTaskReminder(
  to: string,
  payload: {
    taskId: string;
    taskTitle: string;
    dueAt: string | null;
    projectId: string;
    projectName: string;
    senderName: string;
  }
) {
  const resend = getResend();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const dueText = payload.dueAt
    ? `Due: ${new Date(payload.dueAt).toLocaleDateString()}`
    : 'No due date set';

  await resend.emails.send({
    from: fromEmail,
    to,
    subject: `Reminder: ${payload.taskTitle} - ${payload.projectName}`,
    text: `${payload.senderName} sent you a reminder about a task.\n\nTask: ${payload.taskTitle}\nProject: ${payload.projectName}\n${dueText}\n\nView task: ${siteUrl}/projects/${payload.projectId}/tasks`,
    html: `
      <p><strong>${payload.senderName}</strong> sent you a reminder about a task.</p>
      <p><strong>Task:</strong> ${payload.taskTitle}<br>
      <strong>Project:</strong> ${payload.projectName}<br>
      <strong>${dueText}</strong></p>
      <p><a href="${siteUrl}/projects/${payload.projectId}/tasks">View task</a></p>
    `,
  });
}

export async function sendMilestoneReminder(
  to: string,
  payload: {
    milestoneId: string;
    milestoneTitle: string;
    dueAt: string | null;
    projectId: string;
    projectName: string;
    senderName: string;
  }
) {
  const resend = getResend();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const dueText = payload.dueAt
    ? `Due: ${new Date(payload.dueAt).toLocaleDateString()}`
    : 'No due date set';

  await resend.emails.send({
    from: fromEmail,
    to,
    subject: `Milestone Reminder: ${payload.milestoneTitle} - ${payload.projectName}`,
    text: `${payload.senderName} sent you a reminder about a milestone.\n\nMilestone: ${payload.milestoneTitle}\nProject: ${payload.projectName}\n${dueText}\n\nView milestone: ${siteUrl}/projects/${payload.projectId}/milestones`,
    html: `
      <p><strong>${payload.senderName}</strong> sent you a reminder about a milestone.</p>
      <p><strong>Milestone:</strong> ${payload.milestoneTitle}<br>
      <strong>Project:</strong> ${payload.projectName}<br>
      <strong>${dueText}</strong></p>
      <p><a href="${siteUrl}/projects/${payload.projectId}/milestones">View milestone</a></p>
    `,
  });
}
