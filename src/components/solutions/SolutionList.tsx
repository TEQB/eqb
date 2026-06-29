import { SolutionCard } from "./SolutionCard";

interface Solution {
  id: string;
  body: string | null;
  file_url: string | null;
  submitted_by: string;
  author_name: string;
  upvotes: number;
  downvotes: number;
  user_vote: "up" | "down" | null;
  is_own: boolean;
  created_at: string;
  rating_sum: number;
  rating_count: number;
  user_rating: number | null;
}

interface SolutionListProps {
  solutions: Solution[];
}

export function SolutionList({ solutions }: SolutionListProps) {
  if (solutions.length === 0) {
    return null;
  }

  // Sort priority:
  //   1. Average rating (DESC) — highest-rated solutions surface first
  //   2. Number of ratings (DESC) — ties broken by who's been rated more often
  //   3. Net votes (DESC) — older fallback ranking
  //   4. created_at (DESC) — newest first
  const sorted = [...solutions].sort((a, b) => {
    const avgA = a.rating_count > 0 ? a.rating_sum / a.rating_count : 0;
    const avgB = b.rating_count > 0 ? b.rating_sum / b.rating_count : 0;

    if (avgA !== avgB) return avgB - avgA;
    if (a.rating_count !== b.rating_count) return b.rating_count - a.rating_count;

    const netA = a.upvotes - a.downvotes;
    const netB = b.upvotes - b.downvotes;
    if (netA !== netB) return netB - netA;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-3">
      {sorted.map((sol) => (
        <SolutionCard
          key={sol.id}
          id={sol.id}
          body={sol.body}
          fileUrl={sol.file_url}
          authorName={sol.author_name}
          upvotes={sol.upvotes}
          downvotes={sol.downvotes}
          userVote={sol.user_vote}
          isOwn={sol.is_own}
          createdAt={sol.created_at}
          ratingSum={sol.rating_sum}
          ratingCount={sol.rating_count}
          userRating={sol.user_rating}
        />
      ))}
    </div>
  );
}
