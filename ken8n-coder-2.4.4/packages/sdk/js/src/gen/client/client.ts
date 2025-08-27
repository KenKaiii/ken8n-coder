import type { Client, Config, RequestOptions } from "./types.js"
import {
  buildUrl,
  createConfig,
  createInterceptors,
  getParseAs,
  mergeConfigs,
  mergeHeaders,
  setAuthParams,
} from "./utils.js"

// Helper functions for safe header access and response processing
function safeGetHeader(response: Response | undefined, headerName: string): string | null {
  try {
    return response?.headers?.get(headerName) || null
  } catch (error) {
    console.warn(`Could not access ${headerName} header:`, error)
    return null
  }
}

function validateResponse(response: Response | undefined): void {
  if (!response) {
    throw new Error("Fetch returned undefined response")
  }
}

function handleEmptyResponse(response: Response, result: any, opts: any) {
  const contentLength = safeGetHeader(response, "Content-Length")

  if (response.status === 204 || contentLength === "0") {
    return opts.responseStyle === "data"
      ? {}
      : {
          data: {},
          ...result,
        }
  }
  return null
}

function processSuccessResponse(response: Response, result: any, opts: any) {
  const emptyResponse = handleEmptyResponse(response, result, opts)
  if (emptyResponse !== null) return emptyResponse

  const contentType = safeGetHeader(response, "Content-Type")
  const parseAs = (opts.parseAs === "auto" ? getParseAs(contentType) : opts.parseAs) ?? "json"

  return { contentType, parseAs }
}

async function processDataResponse(response: Response, parseAs: string, result: any, opts: any) {
  let data: any
  switch (parseAs) {
    case "arrayBuffer":
    case "blob":
    case "formData":
    case "json":
    case "text":
      data = await response[parseAs]()
      break
    case "stream":
      return opts.responseStyle === "data"
        ? response.body
        : {
            data: response.body,
            ...result,
          }
  }

  if (parseAs === "json") {
    if (opts.responseValidator) {
      await opts.responseValidator(data)
    }

    if (opts.responseTransformer) {
      data = await opts.responseTransformer(data)
    }
  }

  return opts.responseStyle === "data"
    ? data
    : {
        data,
        ...result,
      }
}

function processErrorResponse(response: Response, request: Request, result: any, opts: any, interceptors: any) {
  return async () => {
    const textError = await response.text()
    let jsonError: unknown

    try {
      jsonError = JSON.parse(textError)
    } catch {
      // noop
    }

    const error = jsonError ?? textError
    let finalError = error

    for (const fn of interceptors.error._fns) {
      if (fn) {
        finalError = (await fn(error, response, request, opts)) as string
      }
    }

    finalError = finalError || ({} as string)

    if (opts.throwOnError) {
      throw finalError
    }

    return opts.responseStyle === "data"
      ? undefined
      : {
          error: finalError,
          ...result,
        }
  }
}

type ReqInit = Omit<RequestInit, "body" | "headers"> & {
  body?: any
  headers: ReturnType<typeof mergeHeaders>
}

export const createClient = (config: Config = {}): Client => {
  let _config = mergeConfigs(createConfig(), config)

  const getConfig = (): Config => ({ ..._config })

  const setConfig = (config: Config): Config => {
    _config = mergeConfigs(_config, config)
    return getConfig()
  }

  const interceptors = createInterceptors<Request, Response, unknown, RequestOptions>()

  const request: Client["request"] = async (options) => {
    const opts = {
      ..._config,
      ...options,
      fetch: options.fetch ?? _config.fetch ?? globalThis.fetch,
      headers: mergeHeaders(_config.headers, options.headers),
    }

    if (opts.security) {
      await setAuthParams({
        ...opts,
        security: opts.security,
      })
    }

    if (opts.requestValidator) {
      await opts.requestValidator(opts)
    }

    if (opts.body && opts.bodySerializer) {
      opts.body = opts.bodySerializer(opts.body)
    }

    // remove Content-Type header if body is empty to avoid sending invalid requests
    if (opts.body === undefined || opts.body === "") {
      opts.headers.delete("Content-Type")
    }

    const url = buildUrl(opts)
    const requestInit: ReqInit = {
      redirect: "follow",
      ...opts,
    }

    let request = new Request(url, requestInit)

    for (const fn of interceptors.request._fns) {
      if (fn) {
        request = await fn(request, opts)
      }
    }

    // fetch must be assigned here, otherwise it would throw the error:
    // TypeError: Failed to execute 'fetch' on 'Window': Illegal invocation
    const _fetch = opts.fetch
    let response = await _fetch(request)

    for (const fn of interceptors.response._fns) {
      if (fn) {
        response = await fn(response, request, opts)
      }
    }

    const result = {
      request,
      response,
    }

    validateResponse(response)

    if (response.ok) {
      const successResult = processSuccessResponse(response, result, opts)

      if (typeof successResult === "object" && "parseAs" in successResult) {
        const { parseAs } = successResult
        return await processDataResponse(response, parseAs, result, opts)
      }

      return successResult
    }

    return await processErrorResponse(response, request, result, opts, interceptors)()
  }

  return {
    buildUrl,
    connect: (options) => request({ ...options, method: "CONNECT" }),
    delete: (options) => request({ ...options, method: "DELETE" }),
    get: (options) => request({ ...options, method: "GET" }),
    getConfig,
    head: (options) => request({ ...options, method: "HEAD" }),
    interceptors,
    options: (options) => request({ ...options, method: "OPTIONS" }),
    patch: (options) => request({ ...options, method: "PATCH" }),
    post: (options) => request({ ...options, method: "POST" }),
    put: (options) => request({ ...options, method: "PUT" }),
    request,
    setConfig,
    trace: (options) => request({ ...options, method: "TRACE" }),
  }
}
