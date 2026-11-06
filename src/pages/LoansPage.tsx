import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { services } from "../core/services";
import { useAuth } from "../features/auth/context";
import { QueryState } from "../core/ui";
import { useItem } from "../core/hooks";
import { navigate } from "../core/router";
import { LoanDetails } from "../features/loans/LoanDetails";
import type { Loan } from "../core/types";
function Row({ loan }: { loan: Loan }) {
  const item = useItem(loan.itemId);
  return (
    // Summarize a loan's item, dates, status, and pending photo evidence in the loan list.
    <article>
      <strong>{item.data?.name || loan.itemId}</strong>
      <p>
        {loan.startsOn} to {loan.dueOn} · {loan.status.replaceAll("_", " ")} ·{" "}
        {loan.temporalStatus}
      </p>
      {loan.pendingPhoto && (
        <p>Photo pending: {loan.pendingPhoto.replaceAll("_", " ")}</p>
      )}
      <button onClick={() => navigate("loans", `?loan=${loan.id}`)}>
        Open loan
      </button>
    </article>
  );
}
export default function LoansPage({ loanId }: { loanId: string | null }) {
  const actor = useAuth();
  const [filter, setFilter] = useState("all");
  const [role, setRole] = useState("all");
  const query = useQuery({
    queryKey: ["loans", "list", actor.id],
    queryFn: () => services.loans.getLoans(),
  });
  // Render the selected loan's detail view instead of the loan list.
  if (loanId)
    return (
      // Open loan details from the selected loan deep link.
      <LoanDetails key={loanId} id={loanId} close={() => navigate("loans")} />
    );
  const loans = query.data?.filter(
    (l) =>
      (filter === "all" || l.temporalStatus === filter) &&
      (role === "all" ||
        (role === "borrowed"
          ? l.borrowerId === actor.id
          : l.ownerId === actor.id)),
  );
  return (
    // Filter and list the active user's borrowing and lending records.
    <section>
      <h2>Loans</h2>
      <div className="filter-bar">
        <label>
          When
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {["all", "upcoming", "current", "past"].map((s) => (
              // Represent one temporal filter: all, upcoming, current, or past.
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {["all", "borrowed", "lent"].map((s) => (
              // Represent one borrowing-or-sharing role filter option.
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <QueryState query={query}>
        {loans?.length ? (
          loans.map((l) => /* Render one matching loan through the reusable summary row. */ <Row key={l.id} loan={l} />)
        ) : (
          <p>No loans.</p>
        )}
      </QueryState>
    </section>
  );
}
