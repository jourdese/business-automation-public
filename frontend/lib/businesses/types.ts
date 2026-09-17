export type InitialBusiness = {
  displayName: string;
  publicPath: string;
  adapterKey: string;
  presetKey: string | null;
};

export type BusinessSiteProps = { business: InitialBusiness };
