import { getCurrentWorkspaceId } from '@/app/actions';
import { getBlogPosts, getSeoProjects } from '@/app/actions/seo';
import { SeoPageClient } from './seo-page-client';

export default async function SeoPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view SEO tracking</p>
      </div>
    );
  }

  const [blogPosts, seoProjects] = await Promise.all([
    getBlogPosts(workspaceId),
    getSeoProjects(workspaceId),
  ]);

  return <SeoPageClient blogPosts={blogPosts} seoProjects={seoProjects} />;
}
