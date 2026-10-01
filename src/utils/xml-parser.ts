import { ContentTreeNode } from "@/src/components/ui/tree-view";

export interface ParsedPageItem {
  id?: string;
  explicitPath?: string;
  name: string; // Sanitized item name for Sitecore URL
  title: string;
  body: string;
  imageUrl: string;
  status: "CREATE" | "UPDATE";
  targetParentPath: string;
  targetFullPath: string;
  matchingNodeId?: string;
  isValid: boolean;
  validationError?: string;
}

export interface ParseResult {
  pages: ParsedPageItem[];
  rawXml: string;
  fileName?: string;
  error?: string;
}

/**
 * Sanitizes a title string into a Sitecore-compatible item name
 */
export function sanitizeItemName(title: string): string {
  if (!title) return "Unnamed-Page";
  return title
    .trim()
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

/**
 * Flattens a ContentTreeNode hierarchy into a map for fast lookup
 */
export function flattenContentTree(nodes: ContentTreeNode[]): ContentTreeNode[] {
  const result: ContentTreeNode[] = [];
  function recurse(list: ContentTreeNode[]) {
    for (const node of list) {
      result.push(node);
      if (node.children && node.children.length > 0) {
        recurse(node.children);
      }
    }
  }
  recurse(nodes);
  return result;
}

/**
 * Parses XML text into structured page items with simple fields (Title, Body, Image)
 */
export function parseXmlContent(
  xmlString: string,
  targetRootPath: string,
  existingNodes: ContentTreeNode[]
): ParseResult {
  if (!xmlString || !xmlString.trim()) {
    return { pages: [], rawXml: "", error: "The provided XML file is empty." };
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");

  const parseError = xmlDoc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    return {
      pages: [],
      rawXml: xmlString,
      error: parseError[0].textContent || "XML Syntax Error: Unable to parse document.",
    };
  }

  // Find candidate elements: <page>, <item>, <article>, <doc>
  const pageElements = Array.from(
    xmlDoc.querySelectorAll("page, item, article, doc, Page, Item, Article")
  );

  if (pageElements.length === 0) {
    // If no wrapper tag, check if root itself is a single page
    const root = xmlDoc.documentElement;
    if (root && (root.querySelector("title, Title") || root.querySelector("body, Body"))) {
      pageElements.push(root);
    }
  }

  if (pageElements.length === 0) {
    return {
      pages: [],
      rawXml: xmlString,
      error: "No <page> or <item> elements found with Title, Body, or Image fields.",
    };
  }

  const rootPath = targetRootPath.toLowerCase().replace(/\/$/, "");
  const flatNodes = flattenContentTree(existingNodes).filter(
    (node) => node.path.toLowerCase().startsWith(`${rootPath}/`)
  );

  const pages: ParsedPageItem[] = pageElements.map((el, index) => {
    // Extract ID and path from attributes or tags
    const id = el.getAttribute("id") || el.getAttribute("key") || el.querySelector("id")?.textContent?.trim() || undefined;
    const explicitPath = el.getAttribute("path") || el.querySelector("path")?.textContent?.trim() || undefined;

    // Helper to get text from various case variations
    const getFieldText = (tagNames: string[]): string => {
      for (const tag of tagNames) {
        const found = el.querySelector(tag);
        if (found && found.textContent) {
          return found.textContent.trim();
        }
      }
      return "";
    };

    const title = getFieldText(["title", "Title", "heading", "name"]);
    const body = getFieldText(["body", "Body", "content", "description", "text"]);
    const imageUrl = getFieldText(["image", "Image", "imageUrl", "img", "thumbnail", "media"]);

    const sanitizedName = sanitizeItemName(title || `Page-${index + 1}`);
    const name = explicitPath?.split("/").filter(Boolean).pop() || sanitizedName;

    // Determine target full path
    const targetFullPath = explicitPath
      ? (explicitPath.startsWith("/") ? `${targetRootPath}${explicitPath}` : `${targetRootPath}/${explicitPath}`)
      : `${targetRootPath}/${name}`;

    // Matching logic: Match by ID/Path attribute with fallback to Title / Item Name
    let matchingNode: ContentTreeNode | undefined = undefined;

    if (id) {
      matchingNode = flatNodes.find((n) => n.id.toLowerCase() === id.toLowerCase());
    }

    if (!matchingNode && explicitPath) {
      matchingNode = flatNodes.find(
        (n) => n.path.toLowerCase() === targetFullPath.toLowerCase()
      );
    }

    if (!matchingNode && title) {
      matchingNode = flatNodes.find(
        (n) =>
          n.name.toLowerCase() === name.toLowerCase() ||
          (n.displayName && n.displayName.toLowerCase() === title.toLowerCase())
      );
    }

    const status: "CREATE" | "UPDATE" = matchingNode ? "UPDATE" : "CREATE";
    const isValid = Boolean(title && (body || imageUrl));

    return {
      id: id || (matchingNode ? matchingNode.id : undefined),
      explicitPath,
      name,
      title: title || `Untitled Item #${index + 1}`,
      body,
      imageUrl,
      status,
      targetParentPath: targetRootPath,
      targetFullPath: matchingNode ? matchingNode.path : targetFullPath,
      matchingNodeId: matchingNode?.id,
      isValid,
      validationError: !title ? "Missing required <title> element." : undefined,
    };
  });

  return {
    pages,
    rawXml: xmlString,
  };
}

export const SAMPLE_XML_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<pages>
  <!-- Page 1: Existing page -> Will update 'About Us' -->
  <page id="page-about" path="/About Us">
    <title>About Us - Global Composable Leader</title>
    <body>Sitecore empowers brands with AI-orchestrated digital experiences, real-time customer data integration, and enterprise-grade headless content operations across web, mobile, and omnichannel endpoints.</body>
    <image>https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&amp;fit=crop&amp;w=1200&amp;q=80</image>
  </page>

  <!-- Page 2: Existing page -> Will update 'Contact' -->
  <page path="/Contact">
    <title>Contact &amp; Global Support</title>
    <body>Reach out to our round-the-clock Sitecore XM Cloud solutions architecture team, certified partner network, and technical support consultants worldwide.</body>
    <image>https://images.unsplash.com/photo-1423666639041-f56000c27a9a?auto=format&amp;fit=crop&amp;w=1200&amp;q=80</image>
  </page>

  <!-- Page 3: New page -> Will create 'AI Ingestion Engine' -->
  <page>
    <title>AI Ingestion Engine</title>
    <body>High-throughput batch ingestion pipeline transforming legacy XML feeds and unstructured documents into native Sitecore content items with schema validation and metadata enrichment.</body>
    <image>https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&amp;fit=crop&amp;w=1200&amp;q=80</image>
  </page>

  <!-- Page 4: New page -> Will create 'Marketplace App Showcase' -->
  <page>
    <title>Marketplace App Showcase</title>
    <body>A centralized marketplace ecosystem for custom XM Cloud extensions, contextual editing panels, third-party DAM integrations, and workflow automation apps adhering to the Blok design system.</body>
    <image>https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&amp;fit=crop&amp;w=1200&amp;q=80</image>
  </page>

  <!-- Page 5: New page -> Will create 'Personalization and Analytics' -->
  <page>
    <title>Personalization and Edge Analytics</title>
    <body>Leverage edge computing and customer data platform signals to dynamically tailor page variations, multivariate tests, and recommendation widgets with sub-second response times.</body>
    <image>https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&amp;fit=crop&amp;w=1200&amp;q=80</image>
  </page>
</pages>`;
