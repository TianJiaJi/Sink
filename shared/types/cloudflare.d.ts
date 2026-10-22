declare module 'h3' {
  interface H3EventContext {
    authMethod?: import('./auth').AuthMethod
    userID?: string
    userEmail?: string
    cloudflare: {
      request: Request<unknown, IncomingRequestCfProperties>
      env: Cloudflare.Env
      context: ExecutionContext
    }
  }
}

// AI is an optional integration; deployments without the binding return HTTP 501.
declare global {
  namespace Cloudflare {
    interface Env {
      AI?: Ai
    }
  }
}

export {}
