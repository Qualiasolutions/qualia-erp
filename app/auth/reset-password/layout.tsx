import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Reset your Qualia Suite password — enter your email to receive a reset link.',
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
