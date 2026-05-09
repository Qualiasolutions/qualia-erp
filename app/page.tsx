import { redirect } from 'next/navigation';
import { connection } from 'next/server';

export default async function RootPage() {
  await connection();
  redirect('/auth/login');
}
