import type { DataGateway } from "../../core/gateway";
import { loanFrom } from "../../core/mappers";
export type LoanPlan = { startsOn: string; dueOn: string; lockerId: number };
export function validatePlan(p: LoanPlan) {
  // Reject missing dates or a due date earlier than the start date.
  if (!p.startsOn || !p.dueOn || p.dueOn < p.startsOn)
    throw new Error("End date must be on or after start date.");
  // Reject an exchange plan without a selected locker.
  if (!p.lockerId) throw new Error("Choose a locker.");
}
export function makeLoansService(api: DataGateway) {
  return {
    async getLoans() {
      return (await api.list("loan_catalog", { order: "created_at" })).map(
        loanFrom,
      );
    },
    async getLoan(id: string) {
      const [r] = await api.list("loan_catalog", { eq: { id } });
      return r ? loanFrom(r) : null;
    },
    async createLoan(itemId: string, p: LoanPlan) {
      validatePlan(p);
      await api.rpc("create_loan", {
        target_item: itemId,
        start_date: p.startsOn,
        end_date: p.dueOn,
        selected_locker: p.lockerId,
      });
    },
    async modifyLoan(id: string, revision: number, p: LoanPlan) {
      validatePlan(p);
      await api.rpc("modify_loan", {
        target: id,
        expected_revision: revision,
        start_date: p.startsOn,
        end_date: p.dueOn,
        selected_locker: p.lockerId,
      });
    },
    async approvePlan(id: string, revision: number) {
      await api.rpc("approve_loan", {
        target: id,
        expected_revision: revision,
      });
    },
    async cancelLoan(id: string, revision: number) {
      await api.rpc("cancel_loan", { target: id, expected_revision: revision });
    },
  };
}
