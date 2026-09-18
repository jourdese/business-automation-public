import { listCommandCenterBusinesses } from "./business-registry";

export function commandCenterBusinessStaticParams() {
  return listCommandCenterBusinesses().map((business) => ({
    businessId: business.id,
  }));
}

export function commandCenterOperationStaticParams() {
  return listCommandCenterBusinesses().flatMap((business) =>
    business.operations.map((module) => ({
      businessId: business.id,
      module,
    })),
  );
}
