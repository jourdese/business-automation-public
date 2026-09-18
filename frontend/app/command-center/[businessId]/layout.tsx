import type { ReactNode } from "react";
import CommandCenterShell from "@/components/command-center/CommandCenterShell";
import { CommandCenterRuntimeProvider } from "@/command-center/core/runtime-provider";

export default function CommandCenterBusinessLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <CommandCenterRuntimeProvider>
      <CommandCenterShell>{children}</CommandCenterShell>
    </CommandCenterRuntimeProvider>
  );
}
