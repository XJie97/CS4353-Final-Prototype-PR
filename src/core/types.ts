export type User = {
  id: string;
  name: string;
  username: string | null;
  avatarPath: string | null;
  spriteId: string;
};
export type Sprite = {
  id: string;
  category: "user" | "item";
  colour: string;
  headAssetId: string | null;
  torsoAssetId: string | null;
  level: number | null;
};
export type Locker = { id: number; name: string };
export type Item = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  tags: string[];
  lockerIds: number[];
  status: string;
  spriteId: string;
  compliments: string[];
};
export type PhotoStep =
  "owner_dropoff" | "borrower_pickup" | "borrower_dropoff" | "owner_pickup";
export const STEPS: PhotoStep[] = [
  "owner_dropoff",
  "borrower_pickup",
  "borrower_dropoff",
  "owner_pickup",
];
export const STEP_LABELS: Record<PhotoStep, string> = {
  owner_dropoff: "Owner dropoff",
  borrower_pickup: "Borrower collection",
  borrower_dropoff: "Borrower return",
  owner_pickup: "Owner collection",
};
export type Loan = {
  id: string;
  itemId: string;
  ownerId: string;
  borrowerId: string;
  startsOn: string;
  dueOn: string;
  lockerId: number | null;
  revision: number;
  status: string;
  temporalStatus: string;
  phase: string;
  pendingPhoto: PhotoStep | null;
  nextScan: PhotoStep | null;
  photos: Record<PhotoStep, string | null>;
  checklist: { version: number; items: { id: string; label: string }[] };
  answers: string[];
};
export type Review = {
  id: string;
  itemId: string;
  ownerId: string;
  authorId: string;
  authorName: string;
  body: string;
  imagePath: string | null;
  compliments: string[];
  createdAt: string;
};
export type Friendship = {
  id: string;
  requesterId: string;
  recipientId: string;
  status: "pending" | "accepted";
};
export type Chat = {
  id: string;
  otherUserId: string;
  lastMessage: string | null;
  hasImage: boolean;
  lastAt: string;
};
export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  body: string;
  imagePath: string | null;
  createdAt: string;
};
export type QrChallenge = {
  id: string;
  loanId: string;
  step: PhotoStep;
  lockerId: number;
  payload: string;
};
export const COMPLIMENTS = ["Compliment 1", "Compliment 2", "Compliment 3"];
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const stepActor = (loan: Loan, step: PhotoStep) =>
  step.startsWith("owner") ? loan.ownerId : loan.borrowerId;
