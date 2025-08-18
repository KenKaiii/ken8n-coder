import { z } from "zod"
import { Tool } from "./tool"
import TurndownService from "turndown"
import DESCRIPTION from "./webfetch.txt"
import { Config } from "../config/config"
import { Permission } from "../permission"

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_TIMEOUT = 30 * 1000 // 30 seconds
const MAX_TIMEOUT = 120 * 1000 // 2 minutes

export const WebFetchTool = Tool.define("webfetch", {
  description: DESCRIPTION,
  parameters: z.object({
    url: z.string().describe("The URL to fetch content from"),
    format: z
      .enum(["text", "markdown", "html"])
      .describe("The format to return the content in (text, markdown, or html)"),
    timeout: z.number().describe("Optional timeout in seconds (max 120)").optional(),
  }),
  async execute(params, ctx) {
    // Validate URL
    if (!params.url.startsWith("http://") && !params.url.startsWith("https://")) {
      throw new Error("URL must start with http:// or https://")
    }

    const cfg = await Config.get()
    if (cfg.permission?.webfetch === "ask")
      await Permission.ask({
        type: "webfetch",
        pattern: params.url,
        sessionID: ctx.sessionID,
        messageID: ctx.messageID,
        callID: ctx.callID,
        title: "Fetch content from: " + params.url,
        metadata: {
          url: params.url,
          format: params.format,
          timeout: params.timeout,
        },
      })

    const timeout = Math.min((params.timeout ?? DEFAULT_TIMEOUT / 1000) * 1000, MAX_TIMEOUT)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    // Handle abort signals manually for compatibility
    const abortHandler = () => controller.abort()
    ctx.abort.addEventListener('abort', abortHandler)

    try {
      const response = await fetch(params.url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      })

      clearTimeout(timeoutId)
      ctx.abort.removeEventListener('abort', abortHandler)

      // Validate response object exists and has required properties
      if (!response) {
        throw new Error("Fetch returned undefined response")
      }
      
      if (!response.ok) {
        throw new Error(`Request failed with status code: ${response.status}`)
      }

      // Safely check content length with proper error handling
      let contentLength: string | null = null
      try {
        contentLength = response.headers?.get("content-length") || null
      } catch (error) {
        console.warn("Could not access response headers:", error)
      }
      
      if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
        throw new Error("Response too large (exceeds 5MB limit)")
      }

      const arrayBuffer = await response.arrayBuffer()
      if (arrayBuffer.byteLength > MAX_RESPONSE_SIZE) {
        throw new Error("Response too large (exceeds 5MB limit)")
      }

      const content = new TextDecoder().decode(arrayBuffer)
      
      // Safely get content type with error handling
      let contentType = ""
      try {
        contentType = response.headers?.get("content-type") || ""
      } catch (error) {
        console.warn("Could not access content-type header:", error)
        contentType = ""
      }

      const title = `${params.url} (${contentType})`
      switch (params.format) {
        case "text":
          if (contentType.includes("text/html")) {
            const text = await extractTextFromHTML(content)
            return {
              output: text,
              title,
              metadata: {},
            }
          }
          return {
            output: content,
            title,
            metadata: {},
          }

        case "markdown":
          if (contentType.includes("text/html")) {
            const markdown = convertHTMLToMarkdown(content)
            return {
              output: markdown,
              title,
              metadata: {},
            }
          }
          return {
            output: "```\n" + content + "\n```",
            title,
            metadata: {},
          }

        case "html":
          return {
            output: content,
            title,
            metadata: {},
          }

        default:
          return {
            output: content,
            title,
            metadata: {},
          }
      }
    } catch (error) {
      clearTimeout(timeoutId)
      ctx.abort.removeEventListener('abort', abortHandler)
      throw error
    }
  },
})

async function extractTextFromHTML(html: string) {
  // Try HTMLRewriter first, fallback to regex if it fails
  try {
    let text = ""
    let skipContent = false

    const rewriter = new HTMLRewriter()
      .on("script, style, noscript, iframe, object, embed", {
        element() {
          skipContent = true
        },
        text() {
          // Skip text content inside these elements
        },
      })
      .on("*", {
        element(element) {
          // Reset skip flag when entering other elements
          if (!["script", "style", "noscript", "iframe", "object", "embed"].includes(element.tagName)) {
            skipContent = false
          }
        },
        text(input) {
          if (!skipContent) {
            text += input.text
          }
        },
      })

    const transformedResponse = rewriter.transform(new Response(html))
    if (transformedResponse) {
      await transformedResponse.text()
    }
    return text.trim()
  } catch (error) {
    // Fallback to regex-based text extraction for compiled binaries
    console.warn("HTMLRewriter failed, using fallback:", error)
    return extractTextFromHTMLFallback(html)
  }
}

function extractTextFromHTMLFallback(html: string): string {
  // Remove script, style, and other non-content tags
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim()
  
  return text
}

function convertHTMLToMarkdown(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  })
  turndownService.remove(["script", "style", "meta", "link"])
  return turndownService.turndown(html)
}
