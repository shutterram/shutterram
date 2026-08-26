# Galleries: Drive linking, viewer upgrades, worksheet & RAW delivery

## First, the reality check

Two parts of your description don't work the way you expect. Everything else does.

**1. Google Drive cannot zip files for you via API.**
There is no Drive API endpoint that says "package these 40 files and start a download".
The only place Drive zips anything is its own web UI, when a human selects files in
drive.google.com and hits Download. So "the app asks Drive to package it" isn't possible.

Realistic options, all of which keep the bytes off your database/storage:

- **Open in Drive (best for RAWs).** The app creates a real Drive folder (e.g.
`Smith Wedding / SELECTED RAW`), copies/shortcuts the picked RAW files into it —
copies inside Drive are instant and cost no bandwidth — then gives you/the client a
normal Drive folder link. Drive's own UI does the zipping and the download. This is
the only way 10s of GB works.
- **Direct per-file download.** Browser downloads each file straight from Drive one by
one (fine for a handful of JPEGs, not for 200 RAWs).
- **Browser-side zip.** The browser streams files from Drive and zips locally. Nothing
touches your backend, but the client's machine downloads the whole thing into memory /
disk — okay up to a few GB, bad beyond that.

Plan: use **Open in Drive** as the default for RAW/bulk, per-file for single downloads,  
browser-side zip as an option for preview JPEG galleries. 

**My notes for this:** Lets do this: Open in Drive (best for RAWs) only for RAW files on my end. Direct per-file download for single downloads both for me and client.  Browser-side zip, is this works on any device, do this for any bulk client side downloads. I am ok to download from a folder from google drive ui. but i dont wanna route my clients to drive again. so lets keep any client side downloads on our website itself. just tell them while its downloading that it takes time, and progress of the download, it should also keep downloading in background if possible. 

**2. Client downloads from a private Drive folder need the file to be reachable.**
Right now every image is streamed through our server (a proxy). That's fine for small
thumbnails but terrible for full-size originals. For originals we'll instead mint a
short-lived Drive link / set link-sharing on the specific delivery folder so the transfer
is Google → client, never through us.

**3. Storage note.** Even for Drive-linked galleries we should generate small WebP
thumbnails (~30–60 KB each) into storage, otherwise a 400-image gallery is unusably slow.
400 images ≈ 20 MB — well inside the free tier. Originals/RAWs never get stored.

## What gets built

### A. Gallery source: Drive or Upload

When creating a gallery, pick one:

- **Google Drive** — preview/JPEG folder ID, plus an optional **RAW folder ID**.
RAWs are matched to previews by filename stem (`IMG_2841.jpg` ↔ `IMG_2841.CR2`).
- **Direct upload** — current uploader, plus a **compression slider**
(Light / Balanced / Small, long edge + quality) showing live estimated size per photo
and total for the batch before upload.

Both galleries (selection and final delivery) accept either source.

### B. Viewer upgrades (both client galleries)

- Full-screen button; in full-screen a floating download button sits top-right.
- Swipe between images; pinch-zoom and wheel/double-tap zoom with pan.
- Long-press (or right-click on desktop) enters multi-select mode: select many images,
then star them or download the selection.
- "Starred only" filter alongside the existing picked filter.
- A custom scrollbar rail on the right — draggable thumb with a grab handle on
touch devices, smooth, with a position/percentage hint while dragging.
- Normal-view download button stays where it is today.

### C. Selection worksheet (CRM)

Download-worksheet button on each selection gallery → CSV/XLSX with one row per picked
photo: filename, star rating, label, comment/notes, picked-at, plus an empty **Done**
checkbox column for you to tick while editing.

### D. RAW delivery from picks

For Drive-linked galleries with a RAW folder: **"Send picks to Drive"** creates
`<gallery title> — SELECTED RAW` in Drive, copies the matching RAW files into it, and
gives you the folder link. Report any picks with no matching RAW.

## Technical notes

- Schema: add `source`, `raw_folder_id`, `delivery_folder_id`, `compression` to
`crm_galleries`; add `starred`, `original_name`, `drive_raw_file_id` where missing on
images/picks.
- New Drive server helpers: `copyFileToFolder`, `createDeliveryFolder`,
`setFolderLinkSharing`, `resolveRawMatches`.
- Thumb generation for Drive galleries happens on gallery creation (server pulls from
Drive, downscales to WebP, stores in `crm-galleries`).
- Viewer work goes into a shared `GalleryViewer` component used by `/g/$token` and the
final-gallery route, so both stay identical.

## Build order

1. Schema + Drive helpers (copy/share/match).
2. Gallery creation UI: source toggle, RAW folder, compression slider with size estimate.
3. Shared viewer: full-screen, zoom, swipe, multi-select, star filter, custom scrollbar.
4. Downloads: per-file, browser-zip for previews, Open-in-Drive for RAW/bulk.
5. CRM worksheet export + "Send picks to Drive".