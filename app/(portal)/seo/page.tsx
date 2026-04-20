import type { Metadata } from 'next';
import { getCurrentWorkspaceId } from '@/app/actions';
import { getBlogPosts, getSeoProjects, getBlogTasks } from '@/app/actions/seo';
import { SeoPageClient } from './seo-page-client';

export const metadata: Metadata = { title: 'SEO' };

export default async function SeoPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view SEO tracking</p>
      </div>
    );
  }

  const [blogPosts, seoProjects, blogTasks] = await Promise.all([
    getBlogPosts(workspaceId),
    getSeoProjects(workspaceId),
    getBlogTasks(workspaceId),
  ]);

  return <SeoPageClient blogPosts={blogPosts} seoProjects={seoProjects} blogTasks={blogTasks} />;
}
