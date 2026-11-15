import { currentUser, type User } from './auth';
import { giveBackCredit, takeCredit } from './account';
import { paymentsEnabled } from './pricing';
import { rateLimited } from './guard';
import { isMock } from './llm';

/** Every agent run needs a signed-in user; with payments on it also uses one credit. */
export async function startRun(ip: string): Promise<{ user: User; paid: boolean; left?: number; refund: () => Promise<void> } | Response> {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Please sign in to continue.', needLogin: true }, { status: 401 });
  if (paymentsEnabled()) {
    try {
      const left = await takeCredit(user.id);
      return { user, paid: true, left, refund: async () => void (await giveBackCredit(user.id)) };
    } catch {
      return Response.json({ error: 'You have no report credits left.', needPayment: true }, { status: 402 });
    }
  }
  if (!isMock() && rateLimited('run:' + user.id, 5)) return Response.json({ error: 'You have reached the limit for this hour.' }, { status: 429 });
  return { user, paid: false, refund: async () => {} };
}
