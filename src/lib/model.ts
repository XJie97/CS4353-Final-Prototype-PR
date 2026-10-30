export type Profile = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_path: string | null;
  sprite_id: string;
};
export type Item = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  status: "available" | "on_loan";
  compliments: string[];
  sprite_id: string;
};
export type Loan = {
  id: string;
  item_id: string;
  borrower_id: string;
  starts_on: string;
  due_on: string;
  temporal_status: "past" | "current" | "upcoming";
  specific_status: "pre_collection" | "on_loan" | "returned";
  owner_dropoff_at: string | null;
  borrower_pickup_at: string | null;
  borrower_dropoff_at: string | null;
  returned_at: string | null;
  owner_dropoff_image: string | null;
  borrower_pickup_image: string | null;
  borrower_dropoff_image: string | null;
  owner_pickup_image: string | null;
  review_text: string | null;
  review_compliments: string[];
  review_image_path: string | null;
  sprite_colour: string;
};
export type Friendship = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted";
};
export type Chat = {
  id: string;
  user_one_id: string;
  user_two_id: string;
  created_at: string;
};
export type Location = {
  id: string;
  item_id: string;
  name: string;
  latitude: number;
  longitude: number;
};
export type Sprite = {
  id: string;
  category: "user" | "item";
  colour: string;
  head_asset_id: string | null;
  torso_asset_id: string | null;
  level: number | null;
};
export type ItemImage = {
  id: string;
  item_id: string;
  storage_path: string;
  sort_order: number;
};
export const COMPLIMENTS = ["Compliment 1", "Compliment 2", "Compliment 3"];
export const MILESTONES = [
  {
    key: "owner_dropoff",
    label: "Owner dropoff",
    field: "owner_dropoff_at",
    image: "owner_dropoff_image",
    actor: "owner",
  },
  {
    key: "borrower_pickup",
    label: "Borrower pickup",
    field: "borrower_pickup_at",
    image: "borrower_pickup_image",
    actor: "borrower",
  },
  {
    key: "borrower_dropoff",
    label: "Borrower dropoff",
    field: "borrower_dropoff_at",
    image: "borrower_dropoff_image",
    actor: "borrower",
  },
  {
    key: "owner_pickup",
    label: "Owner pickup",
    field: "returned_at",
    image: "owner_pickup_image",
    actor: "owner",
  },
] as const;

export function nextMilestone(loan: Loan) {
  return MILESTONES.find((step) => !loan[step.field]);
}
export function friendlyError(error: unknown) {
  const e = error as { code?: string; message?: string };
  if (e?.code === "23P01")
    return "These dates overlap another loan for this item. Choose a different date range.";
  if (e?.code === "23505")
    return "This item is still with another borrower, or this step has already been recorded. Refresh and try again.";
  if (e?.code === "42501")
    return "You do not have permission for this action. Check the loan participant and next verification step.";
  return e?.message || "Something went wrong. Please try again.";
}
export function fileExtension(file: File) {
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Choose an image smaller than 5 MB.");
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extensions[file.type];
  if (!ext) throw new Error("Choose a JPEG, PNG, or WebP image.");
  return ext;
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
