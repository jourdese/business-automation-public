import OperationModuleView from "@/components/command-center/OperationModuleView";

type RouteParams = { businessId: string; module: string };
type RoutePageProps = { params: Promise<RouteParams> | RouteParams };

export default async function CommandCenterOperationModulePage({
  params,
}: RoutePageProps) {
  const { businessId, module } = await params;
  return <OperationModuleView businessId={businessId} moduleId={module} />;
}
