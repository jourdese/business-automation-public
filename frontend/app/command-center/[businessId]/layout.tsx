import type { ReactNode } from "react";
import CommandCenterShell from "@/components/command-center/CommandCenterShell";
import { CommandCenterRuntimeProvider } from "@/command-center/core/runtime-provider";
import { commandCenterBusinessStaticParams } from "@/command-center/core/static-params";

export const dynamicParams = false;
export const generateStaticParams = commandCenterBusinessStaticParams;

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
