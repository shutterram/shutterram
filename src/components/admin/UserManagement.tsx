import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
import { Toggle } from "@/components/admin/Toggle";
  createUser,
  deleteUser,
  listUsers,
  setUserAdmin,
  setUserPassword,
  type ManagedUser,
} from "@/lib/users.functions";

const field =
  "w-full border-0 border-b border-hairline bg-transparent pb-2 text-sm focus:border-foreground focus:outline-none";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

/**
 * Users — invite maintainers, promote or demote admins, reset a password or
 * remove an account. Every action runs through an admin-only server function.
 */
export function UserManagement() {
  const fetchUsers = useServerFn(listUsers);
  const addUser = useServerFn(createUser);
  const changePassword = useServerFn(setUserPassword);
  const changeRole = useServerFn(setUserAdmin);
  const removeUser = useServerFn(deleteUser);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(true);

  const load = async () => {
    try {
      setUsers(await fetchUsers({}));
    } catch (error) {
      toast.error(message(error));
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(done);
      await load();
    } catch (error) {
      toast.error(message(error));
    }
    setBusy(false);
  };

  return (
    <div className="space-y-12 pb-20">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Everyone listed here can sign in at <span className="text-foreground">/auth</span>. Only
        accounts marked as admin can open the Content Studio.
      </p>

      <section className="space-y-6 border border-hairline p-6">
        <h3 className="eyebrow">Add a person</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-3 ${field}`}
            />
          </label>
          <label className="block">
            <span className="eyebrow">Temporary password</span>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={`mt-3 ${field}`}
            />
          </label>
          <label className="flex items-center gap-3 self-end pb-1">
            <Toggle
              checked={makeAdmin}
              onChange={(v) => setMakeAdmin(v)}

              />
            <span className="text-sm">Give Content Studio access (admin)</span>
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await addUser({ data: { email, password, isAdmin: makeAdmin } });
              setEmail("");
              setPassword("");
            }, "Account created.")
          }
          className="inline-flex items-center border border-foreground bg-foreground px-7 py-3 text-[0.6875rem] tracking-[0.24em] uppercase text-background disabled:opacity-60"
        >
          Create account
        </button>
      </section>

      <section className="space-y-4">
        <h3 className="eyebrow">People ({users.length})</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="divide-y divide-hairline border-y border-hairline">
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{u.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Joined {new Date(u.createdAt).toLocaleDateString()} ·{" "}
                    {u.lastSignInAt
                      ? `last signed in ${new Date(u.lastSignInAt).toLocaleDateString()}`
                      : "never signed in"}
                  </p>
                </div>

                <label className="flex items-center gap-2 text-xs">
                  <Toggle
                    checked={u.isAdmin}
                    disabled={busy}
                    onChange={(v) =>
                      void run(
                        () => changeRole({ data: { userId: u.id, isAdmin: v } }),
                        "Access updated.",
                      )
                    }

              />
                  Admin
                </label>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const next = window.prompt(`New password for ${u.email}`);
                    if (!next) return;
                    void run(
                      () => changePassword({ data: { userId: u.id, password: next } }),
                      "Password updated.",
                    );
                  }}
                  className="inline-flex items-center gap-2 border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.24em] uppercase hover:border-foreground"
                >
                  <KeyRound className="size-3.5" /> Password
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(`Remove ${u.email}? This cannot be undone.`)) return;
                    void run(() => removeUser({ data: { userId: u.id } }), "Account removed.");
                  }}
                  className="inline-flex items-center gap-2 border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.24em] uppercase text-destructive hover:border-destructive"
                >
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
