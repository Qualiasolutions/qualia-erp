import { getPendingReviews } from '@/app/actions/phase-reviews';
import { ReviewsQueue } from './reviews-queue';

export const metadata = {
  title: 'Phase Reviews | Qualia',
};

export default async function ReviewsPage() {
  const reviews = await getPendingReviews();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Phase Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Review and approve trainee phase submissions
        </p>
      </div>

      <ReviewsQueue initialReviews={reviews} />
    </div>
  );
}
