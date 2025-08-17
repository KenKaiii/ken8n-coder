export namespace Flag {
  export const KEN8N_CODER_AUTO_SHARE = truthy("KEN8N_CODER_AUTO_SHARE")
  export const KEN8N_CODER_DISABLE_WATCHER = truthy("KEN8N_CODER_DISABLE_WATCHER")
  export const KEN8N_CODER_CONFIG = process.env["KEN8N_CODER_CONFIG"]
  export const KEN8N_CODER_DISABLE_AUTOUPDATE = truthy("KEN8N_CODER_DISABLE_AUTOUPDATE")
  export const KEN8N_CODER_PERMISSION = process.env["KEN8N_CODER_PERMISSION"]
  export const KEN8N_CODER_DISABLE_DEFAULT_PLUGINS = truthy("KEN8N_CODER_DISABLE_DEFAULT_PLUGINS")

  function truthy(key: string) {
    const value = process.env[key]?.toLowerCase()
    return value === "true" || value === "1"
  }
}
