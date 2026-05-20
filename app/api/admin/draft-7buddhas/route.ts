import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/app/actions/shared';
import { createZohoMailDraft } from '@/lib/integrations/zoho';

/**
 * One-off admin endpoint: drop a portal-walkthrough email into the workspace
 * Zoho Mail drafts for the 7 Buddhas primary contact.
 *
 * Exists because TOKEN_ENCRYPTION_KEY is a Sensitive env on Vercel and can't
 * be read by any CLI — only the deployed runtime has it in process.env, so
 * the draft must be created from inside the deployed app.
 *
 * REMOVE this file once the draft has been created (one-shot).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  }
  if (!(await isUserAdmin(user.id))) {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const WORKSPACE_ID = 'bf96d0a9-1df8-4361-8df3-7b6d87a21343';
  const TO = 'ernst.potempa@gmail.com';
  const SUBJECT = 'Your 7 Buddhas portal — quick walkthrough';
  const BODY = `<p>Hi Ernst,</p>

<p>Your client portal for the 7 Buddhas project is live at:</p>

<p><a href="https://portal.qualiasolutions.net"><strong>https://portal.qualiasolutions.net</strong></a></p>

<p>You already have an account under this email — just sign in with the password you set up. If you've forgotten it, click <em>Forgot password</em> on the login screen.</p>

<p>Once you're in, three things would help us most:</p>

<ol>
  <li><strong>Open the brief</strong> — there's a short intake form on your project page. Fill in what you can (goals, audience, modules, any references). It takes about 5 minutes and tells us exactly what to build.</li>
  <li><strong>Upload anything we should see</strong> — logo, photos, your existing booking flow, screenshots of platforms you like. Drop them in the brief or in Files.</li>
  <li><strong>Use Requests for anything new</strong> — once we're building, the Requests tab is the fastest way to send a change, a question, or a new idea. We'll see it instantly.</li>
</ol>

<p>Everything you submit lands directly with our team — no need to email back and forth.</p>

<p>Any questions, just reply here.</p>

<p>Best,<br />
Hasan<br />
Qualia Solutions</p>`;

  const result = await createZohoMailDraft(WORKSPACE_ID, {
    to: TO,
    subject: SUBJECT,
    body: BODY,
  });

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}

// GET handler so the user can trigger it by simply visiting the URL while
// logged in — convenient for a one-shot. Same auth as POST.
export async function GET() {
  return POST();
}
