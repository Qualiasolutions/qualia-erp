import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Redirect /projects/[id]/roadmap to /projects/[id] since roadmap is now the main view
export default async function RoadmapPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/projects/${id}`);
}
