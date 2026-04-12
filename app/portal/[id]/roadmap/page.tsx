import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Redirect /portal/[id]/roadmap to /portal/[id] since roadmap is now the main view
export default async function RoadmapPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/portal/${id}`);
}
