import CommandCenterSectionView from "@/components/command-center/CommandCenterSectionView";
import { commandCenterBusinessStaticParams } from "@/command-center/core/static-params";

export const dynamicParams = false;
export const generateStaticParams = commandCenterBusinessStaticParams;

export default function CommandCenterBriefingsPage() {
  return <CommandCenterSectionView section="briefings" />;
}
