import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/notifications/read
 * Body: { id: string } — mark a single notification read
 *       { all: true }   — mark all read for the current user
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401);

  const body = (await request.json().catch(() => ({}))) as { id?: string; all?: boolean };

  if (body.all === true) {
    const { error: e } = await locals.supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', locals.user.id)
      .eq('read', false);
    if (e) error(500, e.message);
    return json({ ok: true });
  }

  if (typeof body.id === 'string' && body.id.length > 0) {
    const { error: e } = await locals.supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', body.id)
      .eq('user_id', locals.user.id);
    if (e) error(500, e.message);
    return json({ ok: true });
  }

  error(400, 'Provide either { id } or { all: true }');
};
