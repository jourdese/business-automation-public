import CommandCenterSectionView from "@/components/command-center/CommandCenterSectionView";
import { commandCenterBusinessStaticParams } from "@/command-center/core/static-params";

export const dynamicParams = false;
export const generateStaticParams = commandCenterBusinessStaticParams;

export default function CommandCenterInsightsPage() {
  return <CommandCenterSectionView section="insights" />;
}
