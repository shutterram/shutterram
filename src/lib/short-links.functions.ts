import { createServerFn } from "@tanstack/react-start";
import { resolveShortCode } from "./short-links.server";
import type { ShortLinkTarget } from "./short-links.server";

/** Public resolve of a short code to its destination. */
export const getShortLink = createServerFn({ method: "GET" })
  .inputValidator((data: { code: string }) => ({
    code: String(data?.code ?? "")
      .slice(0, 32)
      .toLowerCase(),
  }))
  .handler(async ({ data }): Promise<ShortLinkTarget | null> => {
    try {
      return await resolveShortCode(data.code);
    } catch (error) {
      console.error(`[short-links] failed to resolve ${data.code}`, error);
      return null;
    }
  });
