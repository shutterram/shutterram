// pdf-lib's package entry breaks tslib interop in the Worker runtime, so we import
// its self-contained ESM bundle directly. That deep path has no bundled types.
declare module "pdf-lib/dist/pdf-lib.esm.js" {
  const mod: typeof import("pdf-lib");
  export = mod;
}
