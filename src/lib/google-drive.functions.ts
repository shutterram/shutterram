import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const GOOGLE_REDIRECT_PATH = "/api/public/google/callback";

/** Admin: start the Google Drive connection. Returns the consent URL to send the admin to. */
export const startGoogleConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { origin: string }) => input)
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const { assertCrmAdmin } = await import("./crm.server");
    const userId = await assertCrmAdmin(context);
    const { authorizeUrl, signState } = await import("./google-drive.server");
    const redirectUri = `${data.origin.replace(/\/$/, "")}${GOOGLE_REDIRECT_PATH}`;
    const state = await signState(`${userId}|${Date.now()}|${redirectUri}`);
    return { url: authorizeUrl(redirectUri, state) };
  });

export const googleStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { driveStatus } = await import("./google-drive.server");
    try {
      return await driveStatus();
    } catch (error) {
      console.error("[drive] status failed", error);
      return { connected: false as const };
    }
  });

export const googleDisconnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { disconnectDrive } = await import("./google-drive.server");
    await disconnectDrive();
    return { ok: true };
  });

/** Admin: short-lived Drive token so the browser can upload originals straight to Drive. */
export const googleUploadTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { folderName: string; parentId: string }) => input)
  .handler(async ({ data, context }): Promise<{ accessToken: string; folderId: string }> => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { getAccessToken, ensureFolder } = await import("./google-drive.server");
    const folderId = await ensureFolder(data.folderName || "Job", data.parentId);
    return { accessToken: await getAccessToken(), folderId };
  });

/** Admin: list images inside a Drive folder (used to build a final gallery). */
export const googleListImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { folderId: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { listFolderImages } = await import("./google-drive.server");
    const files = await listFolderImages(data.folderId.trim());
    return files.map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType }));
  });
