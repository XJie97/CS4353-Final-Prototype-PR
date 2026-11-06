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
  // Render the pending placeholder while the query is loading.
  if (query.isPending) return /* Show a loading placeholder until query data becomes available. */ <p>Loading…</p>;
  // Render the error state instead of trying to read failed query data.
  if (query.error)
    return (
      // Display query failure with an explicit retry action.
      <p role="alert">
        {errorText(query.error)}{" "}
        <button onClick={() => void query.refetch()}>Retry</button>
      </p>
    );
  return /* Render the feature content after its query has finished successfully. */ <>{children}</>;
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
    // Request a temporary URL only when an image path was supplied.
    if (path)
      void gateway
        .signedUrl(bucket, path)
        .then((u) => {
          // Publish the resolved image URL only while this effect is active.
          if (active) setUrl(u);
        })
        .catch((e) => {
          // Publish image-loading errors only while this effect is active.
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
}: {
  name?: string;
  required?: boolean;
}) {
  return (
    // Restrict file selection to supported photo MIME types.
    <input
      aria-label="Image"
      name={name}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      required={required}
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
    // Present a collection of checkbox choices sharing one form field name.
    <div>
      {options.map((x) => (
        // Represent one selectable checkbox option and its label.
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
