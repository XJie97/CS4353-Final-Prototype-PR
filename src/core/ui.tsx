import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import type { UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import { errorText } from "./errors";
import { gateway } from "./gateway";
export function QueryState({
  query,
  children,
}: {
  query: UseQueryResult<any>;
  children: ReactNode;
}) {
  if (query.isPending) return <p>Loading…</p>;
  if (query.error)
    return (
      <p role="alert">
        {errorText(query.error)}{" "}
        <button onClick={() => void query.refetch()}>Retry</button>
      </p>
    );
  return <>{children}</>;
}
export function MutationState({
  mutation,
}: {
  mutation: UseMutationResult<any, Error, any>;
}) {
  return mutation.error ? (
    <p role="alert">{errorText(mutation.error)}</p>
  ) : mutation.isPending ? (
    <p role="status">Saving…</p>
  ) : mutation.isSuccess ? (
    <p role="status">Saved.</p>
  ) : null;
}
export const value = (fd: FormData, k: string) =>
  String(fd.get(k) || "").trim();
export const numbers = (fd: FormData, k: string) => fd.getAll(k).map(Number);
export const fileValue = (fd: FormData, k: string) => {
  const f = fd.get(k);
  return f instanceof File && f.size ? f : null;
};
export function formAction(action: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    action(new FormData(e.currentTarget));
  };
}
export function FileLink({
  bucket,
  path,
  label = "View image",
}: {
  bucket: string;
  path: string | null;
  label?: string;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setUrl("");
    setError("");
    if (path)
      void gateway
        .signedUrl(bucket, path)
        .then((u) => {
          if (active) setUrl(u);
        })
        .catch((e) => {
          if (active) setError(errorText(e));
        });
    return () => {
      active = false;
    };
  }, [bucket, path]);
  return path ? (
    url ? (
      <a href={url} target="_blank" rel="noreferrer">
        {label}
      </a>
    ) : (
      <small>{error || "Loading image link…"}</small>
    )
  ) : null;
}
export function ImageInput({
  name = "image",
  required = false,
  capture = false,
}: {
  name?: string;
  required?: boolean;
  capture?: boolean;
}) {
  return (
    <input
      aria-label="Image"
      name={name}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      required={required}
      {...(capture ? { capture: "environment" } : {})}
    />
  );
}
export function Choices({
  options,
  name,
  defaults = [],
}: {
  options: { id: number; name: string }[];
  name: string;
  defaults?: number[];
}) {
  return (
    <div>
      {options.map((x) => (
        <label className="inline" key={x.id}>
          <input
            type="checkbox"
            name={name}
            value={x.id}
            defaultChecked={defaults.includes(x.id)}
          />
          {x.name}
        </label>
      ))}
    </div>
  );
}
