import OperationModuleView from "@/components/command-center/OperationModuleView";
import { commandCenterOperationStaticParams } from "@/command-center/core/static-params";

type RouteParams = { businessId: string; module: string };
type RoutePageProps = { params: Promise<RouteParams> | RouteParams };

export const dynamicParams = false;
export const generateStaticParams = commandCenterOperationStaticParams;

export default async function CommandCenterOperationModulePage({
  params,
}: RoutePageProps) {
  const { businessId, module } = await params;
  return <OperationModuleView businessId={businessId} moduleId={module} />;
}
