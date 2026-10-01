import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { executeSitecoreGraphQL, getSitecoreAuthHeaders } from "./sitecore-client";
import { GET_AUTHORING_SINGLE_ITEM_QUERY, UPLOAD_MEDIA_MUTATION } from "./graphql-queries";
import { ImportPagePayload, SitecoreEndpointConfig } from "./types";

const maxImageSize = 10 * 1024 * 1024;
const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const blockedAddresses = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10],
  ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) blockedAddresses.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [
  ["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10],
] as const) blockedAddresses.addSubnet(address, prefix, "ipv6");

function formatMediaId(itemId: string): string {
  const hex = itemId.replace(/[{}-]/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error("Sitecore did not return a valid media item ID.");
  }
  return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}}`;
}

async function downloadImage(source: string): Promise<{ bytes: Buffer; extension: string; contentType: string }> {
  const url = new URL(source);
  if (url.protocol !== "https:" || url.username || url.password || isIP(url.hostname)) {
    throw new Error("Image source must be a public HTTPS hostname.");
  }

  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address, family }) => blockedAddresses.check(address, family === 4 ? "ipv4" : "ipv6"))) {
    throw new Error("Image source must resolve to a public address.");
  }

  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Image download failed (HTTP ${response.status}).`);

  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() || "";
  const extension = imageExtensions[contentType];
  if (!extension) throw new Error("Image source must return JPEG, PNG, WebP, GIF, or AVIF content.");
  if (Number(response.headers.get("content-length")) > maxImageSize) {
    throw new Error("Image exceeds the 10 MB upload limit.");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Image source returned no file data.");
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxImageSize) throw new Error("Image exceeds the 10 MB upload limit.");
      chunks.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  if (!size) throw new Error("Image source returned an empty file.");
  return { bytes: Buffer.concat(chunks), extension, contentType };
}

export async function uploadPageImage(config: SitecoreEndpointConfig, page: ImportPagePayload): Promise<string> {
  const source = new URL(page.imageUrl);
  const digest = createHash("sha256").update(`${page.targetFullPath}:${source.href}`).digest("hex").slice(0, 16);
  const slug = page.name.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 40);
  const itemName = `xml-imports-${slug}-${digest}`;
  const itemPath = `Project/na-collection-demo/skate-park-na/XML Imports/${itemName}`;
  const mediaPath = `/sitecore/media library/${itemPath}`;

  const existing = await executeSitecoreGraphQL<{ item?: { itemId: string } }>(
    config,
    GET_AUTHORING_SINGLE_ITEM_QUERY,
    { where: { path: mediaPath, database: config.database || "master" } }
  );
  if (existing.errors?.length) throw new Error(`Media lookup failed: ${existing.errors[0].message}`);
  if (existing.data?.item?.itemId) return `<image mediaid="${formatMediaId(existing.data.item.itemId)}" />`;

  const { bytes, extension, contentType } = await downloadImage(source.href);
  const requested = await executeSitecoreGraphQL<{ uploadMedia?: { presignedUploadUrl?: string } }>(
    config, UPLOAD_MEDIA_MUTATION, { itemPath }
  );
  if (requested.errors?.length) throw new Error(`Media upload request failed: ${requested.errors[0].message}`);
  const signedUrl = requested.data?.uploadMedia?.presignedUploadUrl;
  if (!signedUrl || new URL(signedUrl).origin !== new URL(config.endpoint).origin) {
    throw new Error("Sitecore returned an invalid media upload URL.");
  }

  const headers = await getSitecoreAuthHeaders(config);
  if (!headers.Authorization) throw new Error("A Sitecore bearer token is required for media upload.");
  const form = new FormData();
  form.append("", new Blob([new Uint8Array(bytes)], { type: contentType }), `${itemName}.${extension}`);
  const uploaded = await fetch(signedUrl, {
    method: "POST",
    headers,
    body: form,
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!uploaded.ok) throw new Error(`Sitecore media upload failed (HTTP ${uploaded.status}).`);

  const result = (await uploaded.json()) as Record<string, unknown>;
  const itemId = result.itemId || result.ItemId || result.mediaItemId || result.MediaItemId || result.id || result.Id;
  if (typeof itemId !== "string") throw new Error("Sitecore media upload returned no media item ID.");
  return `<image mediaid="${formatMediaId(itemId)}" />`;
}