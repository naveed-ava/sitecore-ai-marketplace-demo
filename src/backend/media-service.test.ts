import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { processXmlPageImport } from "./authoring-service";
import { uploadPageImage } from "./media-service";
import { ImportPagePayload, SitecoreEndpointConfig } from "./types";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

const config: SitecoreEndpointConfig = {
  endpoint: "https://xmcloud.example.com/sitecore/api/authoring/graphql/v1",
  token: "test-token",
};
const page: ImportPagePayload = {
  name: "Example Article",
  title: "Example Article",
  body: "Content",
  imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c",
  status: "UPDATE",
  targetParentPath: "/sitecore/content/Home/XML Imports",
  targetFullPath: "/sitecore/content/Home/XML Imports/Example Article",
};
const itemId = "0123456789abcdef0123456789abcdef";
const imageField = '<image mediaid="{01234567-89ab-cdef-0123-456789abcdef}" />';

test("uploads an image through Sitecore's signed URL and returns an Image field value", async () => {
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push(url);
    if (url === config.endpoint) {
      assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-token");
      const request = JSON.parse(String(init?.body));
      if (request.query.includes("uploadMedia(")) {
        assert.match(request.variables.itemPath, /^Project\/na-collection-demo\/skate-park-na\/XML Imports\/xml-imports-Example-Article-[a-f0-9]{16}$/);
        return Response.json({ data: { uploadMedia: { presignedUploadUrl: "https://xmcloud.example.com/media/upload?token=secret" } } });
      }
      assert.equal(request.variables.where.path.startsWith("/sitecore/media library/Project/na-collection-demo/skate-park-na/XML Imports/xml-imports-"), true);
      return Response.json({ data: { item: null } });
    }
    if (url.startsWith("https://images.unsplash.com/")) {
      return new Response(new Uint8Array([255, 216, 255]), { headers: { "content-type": "image/jpeg" } });
    }
    assert.equal(url, "https://xmcloud.example.com/media/upload?token=secret");
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-token");
    const file = (init?.body as FormData).get("") as File;
    assert.equal(file.type, "image/jpeg");
    assert.equal(file.size, 3);
    assert.match(file.name, /^xml-imports-Example-Article-[a-f0-9]{16}\.jpg$/);
    return Response.json({ id: itemId, name: "Example Article", fullPath: "/sitecore/media library/Example Article" });
  };

  assert.equal(await uploadPageImage(config, page), imageField);
  assert.equal(calls.length, 4);
});

test("reuses an existing media item without downloading or uploading", async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return Response.json({ data: { item: { itemId } } });
  };

  assert.equal(await uploadPageImage(config, page), imageField);
  assert.equal(requests, 1);
});

test("rejects local image URLs before downloading", async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return Response.json({ data: { item: null } });
  };

  await assert.rejects(uploadPageImage(config, { ...page, imageUrl: "https://127.0.0.1/private" }), /public HTTPS hostname/);
  assert.equal(requests, 1);
});

test("updates an Article with the Sitecore media reference, not the source URL", async () => {
  let imageValue = "";
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), config.endpoint);
    const request = JSON.parse(String(init?.body));
    if (request.query.includes("GetSites")) return Response.json({ data: { sites: [] } });
    if (request.query.includes("GetAuthoringSingleItem")) return Response.json({ data: { item: { itemId } } });
    if (request.query.includes("updateItem(")) {
      imageValue = request.variables.input.fields.find((field: { name: string }) => field.name === "XML Image")?.value;
      return Response.json({ data: { updateItem: { item: { itemId } } } });
    }
    throw new Error("Unexpected Sitecore request");
  };

  const result = await processXmlPageImport(config, page.targetParentPath, [page]);
  assert.equal(result.success, true);
  assert.equal(result.updated, 1);
  assert.equal(imageValue, imageField);
  assert.notEqual(imageValue, page.imageUrl);
});