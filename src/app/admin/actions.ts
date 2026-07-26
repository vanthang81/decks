'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { upsertDeck, getDeckById, type Visibility } from '@/lib/decks';
import { upsertViewer } from '@/lib/viewers';
import { issueGrant, revokeGrant } from '@/lib/grants';
import { sendMail } from '@/lib/mail';

async function requireAdminEmail(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect('/login');
  return email;
}

export async function createDeckAction(formData: FormData) {
  const by = await requireAdminEmail();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const title = String(formData.get('title') ?? '').trim();
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(slug) || !title) return;
  await upsertDeck({
    slug,
    title,
    description: (String(formData.get('description') ?? '').trim() || null),
    visibility: (String(formData.get('visibility') ?? 'protected') as Visibility),
    require_otp: formData.get('require_otp') === 'on',
    is_published: formData.get('is_published') !== 'off',
    createdBy: by,
  });
  revalidatePath('/admin');
}

export async function issueLinkAction(formData: FormData) {
  const by = await requireAdminEmail();
  const deckId = String(formData.get('deck_id') ?? '');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!deckId || !email) return;
  const deck = await getDeckById(deckId);
  if (!deck) return;

  const viewer = await upsertViewer({
    email,
    name: String(formData.get('name') ?? '').trim() || null,
    company: String(formData.get('company') ?? '').trim() || null,
    createdBy: by,
  });
  const { token } = await issueGrant(deckId, viewer.id, by);
  const link = `${process.env.APP_URL ?? ''}/v/${token}`;

  if (formData.get('send_email') === 'on') {
    await sendMail({
      to: email,
      subject: `Mời xem deck: ${deck.title}`,
      html: `<p>Bạn được mời xem deck <b>${deck.title}</b>.</p>
             <p><a href="${link}">Mở deck</a> (link cá nhân, chỉ dành cho bạn).</p>`,
      kind: 'link',
    }).catch(() => {});
  }
  revalidatePath(`/admin/decks/${deckId}`);
  redirect(`/admin/decks/${deckId}?link=${encodeURIComponent(link)}`);
}

export async function revokeLinkAction(formData: FormData) {
  await requireAdminEmail();
  const grantId = String(formData.get('grant_id') ?? '');
  const deckId = String(formData.get('deck_id') ?? '');
  if (grantId) await revokeGrant(grantId);
  revalidatePath(`/admin/decks/${deckId}`);
}
