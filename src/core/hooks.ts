import { useQuery } from "@tanstack/react-query";
import { services } from "./services";
export const useUsers = () =>
  useQuery({ queryKey: ["users"], queryFn: () => services.users.getUsers() });
export const useUser = (id: string) =>
  useQuery({
    queryKey: ["users", id],
    enabled: !!id,
    queryFn: () => services.users.getUser(id),
  });
export const useLockers = () =>
  useQuery({
    queryKey: ["lockers"],
    queryFn: () => services.items.getLockers(),
  });
export const useItem = (id: string) =>
  useQuery({
    queryKey: ["items", "detail", id],
    enabled: !!id,
    queryFn: () => services.items.getItem(id),
  });
export const useLoan = (id: string) =>
  useQuery({
    queryKey: ["loans", "detail", id],
    queryFn: () => services.loans.getLoan(id),
  });
