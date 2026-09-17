"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      password,
      redirect: false,
    });

    if (res?.ok) {
      router.push("/admin");
    } else {
      setError("That password didn't match.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="w-full max-w-[360px] px-6 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-3xl font-light text-text">
            Canopus
          </h1>
          <p className="font-mono text-[12px] text-muted">
            Sign in to manage photos
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Password" htmlFor="password" error={error || undefined}>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              invalid={!!error}
            />
          </Field>

          <Button type="submit" loading={loading}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
