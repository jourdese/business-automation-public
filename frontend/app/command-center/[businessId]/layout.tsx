import type { ReactNode } from "react";
import CommandCenterShell from "@/components/command-center/CommandCenterShell";

export default function CommandCenterBusinessLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <CommandCenterShell>{children}</CommandCenterShell>;
}
