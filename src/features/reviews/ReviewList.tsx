import { useQuery } from "@tanstack/react-query";
import { services } from "../../core/services";
import { QueryState, FileLink } from "../../core/ui";
export function ReviewList({
  itemId,
  ownerId,
}: {
  itemId?: string;
  ownerId?: string;
}) {
  const query = useQuery({
    queryKey: ["reviews", "public", itemId, ownerId],
    queryFn: () => services.reviews.getReviews(itemId, ownerId),
  });
  return (
    <section>
      <h3>Received reviews</h3>
      <QueryState query={query}>
        {query.data?.length ? (
          query.data.map((r) => (
            <article key={r.id}>
              <p>
                <strong>{r.authorName || "User"}</strong>: {r.body}
              </p>
              <p>{r.compliments.join(", ")}</p>
              <FileLink bucket="loan-review-images" path={r.imagePath} />
            </article>
          ))
        ) : (
          <p>No reviews.</p>
        )}
      </QueryState>
    </section>
  );
}
