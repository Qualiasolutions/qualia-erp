import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Suspense } from 'react';

const errorMessages: Record<string, { title: string; message: string }> = {
  access_denied: {
    title: 'Access Denied',
    message: 'You do not have permission to sign in. Please contact support if this is unexpected.',
  },
  invalid_credentials: {
    title: 'Invalid Credentials',
    message: 'The email or password you entered is incorrect. Please try again.',
  },
  email_not_confirmed: {
    title: 'Email Not Confirmed',
    message: 'Please check your email and click the confirmation link to activate your account.',
  },
  user_not_found: {
    title: 'Account Not Found',
    message: 'No account found with that email address. Please check and try again.',
  },
  otp_expired: {
    title: 'Link Expired',
    message: 'This link has expired. Please request a new one from the login page.',
  },
  no_token_hash_or_type: {
    title: 'Invalid Link',
    message: 'This link is invalid or has already been used. Please request a new one.',
  },
  default: {
    title: 'Authentication Error',
    message: 'We encountered an issue signing you in. Please try again or contact support.',
  },
};

function getErrorInfo(error: string | undefined): { title: string; message: string } {
  if (!error) return errorMessages.default;
  const key = error.toLowerCase().replace(/\s+/g, '_');
  return errorMessages[key] || errorMessages.default;
}

async function ErrorContent({ searchParams }: { searchParams: Promise<{ error: string }> }) {
  const params = await searchParams;
  const errorInfo = getErrorInfo(params?.error);

  return (
    <>
      <CardHeader>
        <CardTitle className="text-2xl">{errorInfo.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{errorInfo.message}</p>
        <Link href="/auth/login">
          <Button variant="outline" className="w-full">
            Back to login
          </Button>
        </Link>
      </CardContent>
    </>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<{ error: string }> }) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <Suspense
              fallback={
                <>
                  <CardHeader>
                    <CardTitle className="text-2xl">Loading...</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Please wait...</p>
                  </CardContent>
                </>
              }
            >
              <ErrorContent searchParams={searchParams} />
            </Suspense>
          </Card>
        </div>
      </div>
    </div>
  );
}
