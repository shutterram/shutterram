import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const DRIVE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

function clientId() {
  const v = process.env["GOOGLE_CLIENT_ID"];
  if (!v) throw new Error("Google is not configured yet: GOOGLE_CLIENT_ID is missing.");
  return v;
}
function clientSecret() {
  const v = process.env["GOOGLE_CLIENT_SECRET"];
  if (!v) throw new Error("Google is not configured yet: GOOGLE_CLIENT_SECRET is missing.");
  return v;
}

const enc = new TextEncoder();

/** Signs the OAuth state so only this server can mint a valid callback. */
export async function signState(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "dev"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const hex = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${payload}.${hex.slice(0, 32)}`;
}

export async function verifyState(state: string): Promise<string | null> {
  const idx = state.lastIndexOf(".");
  if (idx < 0) return null;
  const payload = state.slice(0, idx);
  const expected = await signState(payload);
  return expected === state ? payload : null;
}

export function authorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google token request failed [${res.status}]: ${text}`);
  return JSON.parse(text) as TokenResponse;
}

function emailFromIdToken(idToken?: string): string {
  if (!idToken) return "";
  try {
    const part = idToken.split(".")[1];
    if (!part) return "";
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.email === "string" ? json.email : "";
  } catch {
    return "";
  }
}

/** Completes the OAuth code exchange and stores the long-lived refresh token. */
export async function exchangeCode(code: string, redirectUri: string, userId: string | null) {
  const tokens = await tokenRequest({
    code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const expiresAt = new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString();
  const existing = await supabaseAdmin
    .from("crm_google_account")
    .select("refresh_token")
    .eq("id", true)
    .maybeSingle();
  const refresh = tokens.refresh_token || existing.data?.refresh_token || "";
  const { error } = await supabaseAdmin.from("crm_google_account").upsert(
    {
      id: true,
      email: emailFromIdToken(tokens.id_token),
      access_token: tokens.access_token,
      refresh_token: refresh,
      scope: tokens.scope ?? DRIVE_SCOPES,
      expires_at: expiresAt,
      connected_by: userId,
      connected_at: new Date().toISOString(),
    } as never,
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
}

export async function driveStatus() {
  const { data } = await supabaseAdmin
    .from("crm_google_account")
    .select("email,scope,expires_at,connected_at,refresh_token")
    .eq("id", true)
    .maybeSingle();
  if (!data?.refresh_token) return { connected: false as const };
  return {
    connected: true as const,
    email: data.email ?? "",
    scope: data.scope ?? "",
    connectedAt: data.connected_at ?? null,
  };
}

export async function disconnectDrive() {
  await supabaseAdmin.from("crm_google_account").delete().eq("id", true);
}

/** Returns a valid access token, silently refreshing it when it has expired. */
export async function getAccessToken(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("crm_google_account")
    .select("access_token,refresh_token,expires_at")
    .eq("id", true)
    .maybeSingle();
  if (!data?.refresh_token) throw new Error("Google Drive is not connected yet.");

  const stillValid =
    data.access_token && data.expires_at && new Date(data.expires_at).getTime() > Date.now();
  if (stillValid) return data.access_token;

  const tokens = await tokenRequest({
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: data.refresh_token,
    grant_type: "refresh_token",
  });
  const expiresAt = new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString();
  await supabaseAdmin
    .from("crm_google_account")
    .update({ access_token: tokens.access_token, expires_at: expiresAt } as never)
    .eq("id", true);
  return tokens.access_token;
}

async function driveFetch(path: string, init?: RequestInit, base = DRIVE) {
  const token = await getAccessToken();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google Drive request failed [${res.status}]: ${text}`);
  return text ? JSON.parse(text) : {};
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
  size?: string;
}

/** Finds or creates a sub-folder inside a parent folder. */
export async function ensureFolder(name: string, parentId: string): Promise<string> {
  const safe = name.replace(/'/g, "\\'");
  const q = encodeURIComponent(
    `name = '${safe}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${
      parentId ? ` and '${parentId}' in parents` : ""
    }`,
  );
  const found = (await driveFetch(`/files?q=${q}&fields=files(id,name)&pageSize=1`)) as {
    files?: DriveFile[];
  };
  if (found.files?.[0]?.id) return found.files[0].id;

  const created = (await driveFetch("/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  })) as { id: string };
  return created.id;
}

/** Uploads bytes to Drive with a multipart request. */
export async function uploadToDrive(args: {
  name: string;
  mimeType: string;
  bytes: Uint8Array;
  parentId: string;
}): Promise<{ id: string; webViewLink: string }> {
  const token = await getAccessToken();
  const boundary = `lv${crypto.randomUUID().replace(/-/g, "")}`;
  const metadata = JSON.stringify({
    name: args.name,
    ...(args.parentId ? { parents: [args.parentId] } : {}),
  });
  const head = new TextEncoder().encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${args.mimeType}\r\n\r\n`,
  );
  const tail = new TextEncoder().encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.length + args.bytes.length + tail.length);
  body.set(head, 0);
  body.set(args.bytes, head.length);
  body.set(tail, head.length + args.bytes.length);

  const res = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id,webViewLink`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: body as unknown as BodyInit,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google Drive upload failed [${res.status}]: ${text}`);
  const json = JSON.parse(text) as { id: string; webViewLink?: string };
  return { id: json.id, webViewLink: json.webViewLink ?? `https://drive.google.com/file/d/${json.id}/view` };
}

/** Lists image files inside a Drive folder. */
export async function listFolderImages(folderId: string): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let pageToken = "";
  do {
    const q = encodeURIComponent(
      `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
    );
    const page = (await driveFetch(
      `/files?q=${q}&pageSize=200&orderBy=name&fields=nextPageToken,files(id,name,mimeType,size,thumbnailLink)${
        pageToken ? `&pageToken=${pageToken}` : ""
      }`,
    )) as { files?: DriveFile[]; nextPageToken?: string };
    out.push(...(page.files ?? []));
    pageToken = page.nextPageToken ?? "";
  } while (pageToken && out.length < 2000);
  return out;
}

/** Streams a Drive file's bytes (used to serve final-gallery images through our own domain). */
export async function fetchDriveFile(fileId: string): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`${DRIVE}/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Fetches Google's small generated thumbnail without downloading the original. */
export async function fetchDriveThumbnail(fileId: string): Promise<Response | null> {
  const token = await getAccessToken();
  const metadata = await fetch(
    `${DRIVE}/files/${encodeURIComponent(fileId)}?fields=thumbnailLink`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!metadata.ok) return null;
  const { thumbnailLink } = (await metadata.json()) as { thumbnailLink?: string };
  if (!thumbnailLink) return null;
  const thumbnailUrl = thumbnailLink.replace(/=s\d+(?:-c)?$/, "=w600");
  const response = await fetch(thumbnailUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.ok ? response : null;
}

/** Lists every non-trashed file in a folder (used for RAW folders, which are not images). */
export async function listFolderFiles(folderId: string): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let pageToken = "";
  do {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const page = (await driveFetch(
      `/files?q=${q}&pageSize=200&orderBy=name&fields=nextPageToken,files(id,name,mimeType,size)${
        pageToken ? `&pageToken=${pageToken}` : ""
      }`,
    )) as { files?: DriveFile[]; nextPageToken?: string };
    out.push(...(page.files ?? []));
    pageToken = page.nextPageToken ?? "";
  } while (pageToken && out.length < 5000);
  return out.filter((f) => f.mimeType !== "application/vnd.google-apps.folder");
}

/** Copies a file into another folder — instant inside Drive, no bandwidth cost. */
export async function copyFileToFolder(fileId: string, parentId: string, name?: string) {
  return (await driveFetch(`/files/${encodeURIComponent(fileId)}/copy?fields=id,name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parents: [parentId], ...(name ? { name } : {}) }),
  })) as { id: string; name: string };
}

/** Moves a file into another folder by re-parenting it — no copy is made. */
export async function moveFileToFolder(fileId: string, parentId: string) {
  const current = (await driveFetch(
    `/files/${encodeURIComponent(fileId)}?fields=id,name,parents`,
  )) as { id: string; name: string; parents?: string[] };
  const remove = (current.parents ?? []).filter((p) => p !== parentId);
  if (!remove.length && (current.parents ?? []).includes(parentId)) return current;
  const params = new URLSearchParams({ addParents: parentId, fields: "id,name,parents" });
  if (remove.length) params.set("removeParents", remove.join(","));
  return (await driveFetch(`/files/${encodeURIComponent(fileId)}?${params.toString()}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })) as { id: string; name: string };
}


/** Turns on "anyone with the link can view" for a folder we created. */
export async function setFolderLinkSharing(folderId: string) {
  await driveFetch(`/files/${encodeURIComponent(folderId)}/permissions?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
}

export function driveFolderLink(folderId: string) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

/** Matches preview file names to RAW file names by their stem (IMG_01.jpg ↔ IMG_01.CR2). */
export function matchByStem(files: DriveFile[]): Map<string, DriveFile> {
  const map = new Map<string, DriveFile>();
  for (const f of files) {
    const stem = f.name.replace(/\.[^.]+$/, "").toLowerCase();
    if (!map.has(stem)) map.set(stem, f);
  }
  return map;
}
