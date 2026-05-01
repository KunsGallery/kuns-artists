"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/firebase/auth";

type LogoutButtonProps = {
  className?: string;
  children?: ReactNode;
  redirectTo?: string;
};

export default function LogoutButton({
  className,
  children = "Logout",
  redirectTo = "/artist/login?loggedOut=1",
}: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    try {
      setIsPending(true);
      await logout();
      router.replace(redirectTo);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className={className}
    >
      {isPending ? "Logging out..." : children}
    </button>
  );
}
