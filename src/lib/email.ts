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
    subject: `You were mentioned on TaskNest (task ${payload.taskId})`,
    text: `A teammate mentioned you in a comment:\n\n${payload.body}\n\nOpen the task in TaskNest to reply.`,
  });
}
