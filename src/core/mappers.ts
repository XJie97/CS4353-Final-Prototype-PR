import type { Row } from "./gateway";
import type {
  User,
  Sprite,
  Item,
  Loan,
  Review,
  Friendship,
  Chat,
  Message,
} from "./types";
export const userFrom = (r: Row): User => ({
  id: r.id,
  name: r.display_name,
  username: r.username,
  avatarPath: r.avatar_path,
  spriteId: r.sprite_id,
});
export const spriteFrom = (r: Row): Sprite => ({
  id: r.id,
  category: r.category,
  colour: r.colour,
  headAssetId: r.head_asset_id,
  torsoAssetId: r.torso_asset_id,
  level: r.level,
});
export const itemFrom = (r: Row, lockerIds: number[]): Item => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  description: r.description,
  tags: r.category_tags || [],
  lockerIds,
  status: r.status,
  spriteId: r.sprite_id,
  compliments: r.compliments || [],
});
export const loanFrom = (r: Row): Loan => ({
  id: r.id,
  itemId: r.item_id,
  ownerId: r.owner_id,
  borrowerId: r.borrower_id,
  startsOn: r.starts_on,
  dueOn: r.due_on,
  lockerId: r.locker_id,
  revision: r.revision,
  status: r.lifecycle_status,
  temporalStatus: r.temporal_status,
  phase: r.handoff_phase,
  pendingPhoto: r.pending_photo,
  nextScan: r.next_scan,
  photos: {
    owner_dropoff: r.owner_dropoff_image,
    borrower_pickup: r.borrower_pickup_image,
    borrower_dropoff: r.borrower_dropoff_image,
    owner_pickup: r.owner_pickup_image,
  },
  checklist: r.return_checklist,
  answers: r.return_answers || [],
});
export const reviewFrom = (r: Row): Review => ({
  id: r.id,
  itemId: r.item_id,
  ownerId: r.owner_id,
  authorId: r.author_id,
  authorName: r.author_name,
  body: r.body,
  imagePath: r.image_path,
  compliments: r.compliments,
  createdAt: r.created_at,
});
export const friendFrom = (r: Row): Friendship => ({
  id: r.id,
  requesterId: r.requester_id,
  recipientId: r.recipient_id,
  status: r.status,
});
export const chatFrom = (r: Row): Chat => ({
  id: r.id,
  otherUserId: r.other_user_id,
  lastMessage: r.last_message,
  hasImage: r.has_image,
  lastAt: r.last_at,
});
export const messageFrom = (r: Row): Message => ({
  id: r.id,
  chatId: r.chat_id,
  senderId: r.sender_id,
  body: r.body,
  imagePath: r.image_path,
  createdAt: r.created_at,
});
