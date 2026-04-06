import mammoth from "mammoth";

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  url: string;
  isCloud?: boolean;
}

export const PRESET_TEMPLATES: TemplateMetadata[] = [];

/**
 * Fetch a Word template as an ArrayBuffer
 */
export async function fetchTemplate(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch template");
  return await response.arrayBuffer();
}

/**
 * Convert Docx/Dotx to HTML for form rendering
 */
export async function convertToHTML(arrayBuffer: ArrayBuffer): Promise<string> {
  const { value } = await mammoth.convertToHtml({ arrayBuffer });
  return value;
}

/**
 * Extract potential placeholders (simple ___ or {{tag}} patterns)
 */
export function extractInputs(html: string): string {
    // 1. Process {{tag}} style placeholders first (Higher Fidelity)
    let processedHtml = html.replace(/{{([^{}]+)}}/g, (match, tagName) => {
        const cleanedTag = tagName.trim();
        return `<input type="text" class="clinical-template-input border-b border-muted-foreground outline-none bg-transparent" placeholder="[${cleanedTag}]" data-tag="${cleanedTag}" />`;
    });

    // 2. Process underscore placeholders (Legacy support)
    processedHtml = processedHtml.replace(/_{3,}/g, (match) => {
        return `<input type="text" class="clinical-template-input border-b border-muted-foreground outline-none bg-transparent" placeholder="[entry]" />`;
    });

    return processedHtml;
}
