import type { DataGateway, Row } from "../../core/gateway";
import { reviewFrom } from "../../core/mappers";
import { imageExtension, requireText } from "../../core/errors";
export function makeReviewsService(api: DataGateway) {
  return {
    async getReviews(itemId?: string, ownerId?: string) {
      return (
        await api.rpc<Row[]>("get_reviews", {
          target_item: itemId || null,
          received_by: ownerId || null,
        })
      ).map(reviewFrom);
    },
    async getOwnReviewForLoan(loanId: string) {
      const [r] = await api.list("reviews", { eq: { loan_id: loanId } });
      return r
        ? {
            id: r.id,
            body: r.body as string,
            compliments: r.compliments as string[],
            imagePath: r.image_path as string | null,
          }
        : null;
    },
    async saveReview(
      loanId: string,
      body: string,
      compliments: string[],
      imagePath: string | null,
    ) {
      await api.rpc("save_review", {
        target_loan: loanId,
        body_text: requireText(body, "Review"),
        selected_compliments: compliments,
        image_path_value: imagePath,
      });
    },
    async uploadImage(loanId: string, file: File) {
      return api.upload(
        "loan-review-images",
        `${loanId}/${crypto.randomUUID()}.${imageExtension(file)}`,
        file,
      );
    },
    async deleteReview(id: string) {
      await api.rpc("delete_review", { target: id });
    },
  };
}
