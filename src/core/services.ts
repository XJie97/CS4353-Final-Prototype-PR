import { gateway } from "./gateway";
import { makeAuthService } from "../features/auth/service";
import { makeUsersService } from "../features/users/service";
import { makeFriendshipsService } from "../features/friendships/service";
import { makeItemsService } from "../features/items/service";
import { makeLoansService } from "../features/loans/service";
import {
  makeHandoffService,
  makeSimulatedLocker,
} from "../features/handoff/service";
import { makeReviewsService } from "../features/reviews/service";
import { makeChatsService } from "../features/chats/service";
export const services = {
  auth: makeAuthService(gateway),
  users: makeUsersService(gateway),
  friends: makeFriendshipsService(gateway),
  items: makeItemsService(gateway),
  loans: makeLoansService(gateway),
  handoff: makeHandoffService(gateway, makeSimulatedLocker(gateway)),
  reviews: makeReviewsService(gateway),
  chats: makeChatsService(gateway),
};
