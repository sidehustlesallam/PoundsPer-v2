# Worker Deployment Guide for £Per

This guide provides step-by-step instructions for deploying and managing the £Per backend Worker on Cloudflare. Github repository will only contain copy of code that will be used. User will directly copy/paste code to cloudflare.
You do not have access to cloudflare account, and will be unable to access your Cloudflare account to deploy the Worker directly from Github.

User will also load API keys to secret variables in cloudflare, so use variables listed below.


## 🚀 Deployment Steps

1.  **Prerequisites:**
    *   Ensure you have the Cloudflare CLI installed (`npm install -g wrangler`).
    *   Ensure you are logged in via the CLI (`wrangler login`).
    *   Ensure your local repository contains the latest `cloudflare/worker.js` file.

2.  **Configuration:**
    *   **`wrangler.toml`:** Verify or create a `wrangler.toml` file in the root directory. This file must define the Worker's name, environment, and entry point.
    *   **Environment Variables (Secrets):** Before deployment, all required API keys must be set as environment variables in the Cloudflare dashboard or via the CLI.
        *   `EPC_BASE_URL`
        *   `EPC_API_KEY`
        *   `BROADBAND_BASE_URL`
        *   `BROADBAND_API_KEY`
        *   `FLOOD_BASE_URL`
        *   `FLOOD_API_KEY`
    *   *Note: These secrets must never be committed to version control.*

3.  **Deployment:**
    *   Run the deployment command from the root directory:
        ```bash
        wrangler deploy
        ```
    *   This command uploads the `cloudflare/worker.js` code and links it to the configured environment variables.

## 🔄 Updating the Worker

The Worker must be updated whenever the core logic in `cloudflare/worker.js` changes.

1.  **Local Changes:** Make necessary code modifications in `cloudflare/worker.js`.
2.  **Testing:** Always test the changes locally first using `wrangler dev`.
3.  **Deployment:** Re-run the deployment command: `wrangler deploy`.

## ⚠️ Best Practices

*   **Security:** Never hardcode API keys or sensitive URLs directly into the code. Always use `env.*` variables.
*   **Error Handling:** Implement comprehensive try/catch blocks in the Worker to handle external API failures gracefully, ensuring the frontend always receives a structured JSON response, even if the data is missing.
*   **Caching:** Consider implementing caching strategies within the Worker for frequently requested, non-real-time data (e.g., static datasets) to reduce API calls and improve performance.