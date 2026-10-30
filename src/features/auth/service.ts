import type { DataGateway } from "../../core/gateway";
import { requireText } from "../../core/errors";
export function makeAuthService(api: DataGateway) {
  return {
    signIn: (email: string, password: string) =>
      api.signIn(
        requireText(email, "Email"),
        requireText(password, "Password"),
      ),
    signOut: () => api.signOut(),
    observe: api.observeAuth,
  };
}
