import { useMutation } from "@tanstack/react-query";
import { services } from "../../core/services";
import { MutationState, formAction, value } from "../../core/ui";
export const DEMO_EMAILS = [
  "alice@cs4353.example.test",
  "bob@cs4353.example.test",
  "charlie@cs4353.example.test",
  "dana@cs4353.example.test",
];
export function SignIn() {
  const command = useMutation({
    mutationFn: (fd: FormData) =>
      services.auth.signIn(value(fd, "email"), value(fd, "password")),
  });
  return (
    <section>
      <h2>Sign in</h2>
      <p>
        Use a seeded prototype account. Public signup is disabled in this app.
      </p>
      <form className="stack" onSubmit={formAction((fd) => command.mutate(fd))}>
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            list="demo-users"
            required
          />
        </label>
        <datalist id="demo-users">
          {DEMO_EMAILS.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </datalist>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button disabled={command.isPending}>Sign in</button>
        <MutationState mutation={command} />
      </form>
      <p>
        Demo users: Alice, Bob, Charlie, Dana. Credentials are provisioned
        separately, not embedded in the client.
      </p>
    </section>
  );
}
