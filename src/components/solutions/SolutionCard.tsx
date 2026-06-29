import { VoteButtons } from "./VoteButtons";
import { RatingStars } from "./RatingStars";

interface SolutionCardProps {
  id: string;
  body: string | null;
  fileUrl: string | null;
  authorName: string;
  upvotes: number;
  downvotes: number;
  userVote: "up" | "down" | null;
  isOwn: boolean;
  createdAt: string;
  ratingSum: number;
  ratingCount: number;
  userRating: number | null;
}

export function SolutionCard({
  id,
  body,
  fileUrl,
  authorName,
  upvotes,
  downvotes,
  userVote,
  isOwn,
  createdAt,
  ratingSum,
  ratingCount,
  userRating,
}: SolutionCardProps) {
  const average = ratingCount > 0 ? ratingSum / ratingCount : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{authorName}</p>
            {isOwn && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                You
              </span>
            )}
            {ratingCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[11px] font-semibold text-secondary-700">
                <svg className="h-3 w-3 fill-secondary" viewBox="0 0 24 24">
                  <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.563 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                {average.toFixed(1)} ({ratingCount})
              </span>
            )}
          </div>
          {body && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{body}</p>}
          {fileUrl && (
            <div className="mt-3">
              {fileUrl.match(/\.(jpg|jpeg|png)$/i) ? (
                <a
                  href={`/api/storage/${fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block overflow-hidden rounded-lg border border-gray-200"
                  style={{ maxHeight: 400, maxWidth: 500 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/storage/${fileUrl}`}
                    alt="Solution attachment"
                    className="w-full object-contain"
                  />
                </a>
              ) : (
                <a
                  href={`/api/storage/${fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  View PDF
                </a>
              )}
            </div>
          )}
        </div>
        <VoteButtons
          solutionId={id}
          upvotes={upvotes}
          downvotes={downvotes}
          userVote={userVote}
          isOwn={isOwn}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
        <RatingStars
          solutionId={id}
          ratingCount={ratingCount}
          ratingSum={ratingSum}
          initialUserRating={userRating}
          isOwn={isOwn}
        />
        <p className="text-xs text-gray-400">
          {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
