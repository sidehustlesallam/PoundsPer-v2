## £Per Worker Deployment Guide (Manual Process)

This guide details the manual steps required to deploy the £Per Cloudflare Worker. **Crucially, this process does not involve automated deployment tools.** All code must be manually copied and pasted into the Cloudflare Workers dashboard or via the CLI, and environment variables must be set manually.

### 🛠️ Phase 0: Prerequisites and Setup

1.  **Code Preparation:** Ensure your `cloudflare/worker.js` file contains the final, tested logic.
2.  **API Key Acquisition:** Acquire all necessary API keys (EPC, Broadband, Environment Agency, etc.).
3.  **Environment Variables Setup:**
    *   Navigate to the Cloudflare Workers dashboard for your project.
    *   Go to the "Settings" tab and locate "Environment Variables."
    *   Manually set all required variables:
        *   `EPC_BASE_URL`: [Your EPC Base URL]
        *   `EPC_API_KEY`: [Your EPC API Key]
        *   `BROADBAND_BASE_URL`: [Your Broadband Base URL]
        *   `BROADBAND_API_KEY`: [Your Broadband API Key]
        *   `FLOOD_BASE_URL`: [Your Flood Base URL]
        *   `FLOOD_API_KEY`: [Your Flood API Key]
        *   *(Add any other required keys)*

### 💻 Phase 1: Worker Deployment (Manual Copy/Paste)

1.  **Copy Code:** Open the `cloudflare/worker.js` file in your local repository. Select and copy the *entire* content of the file.
2.  **Paste Code:** In the Cloudflare Workers dashboard, navigate to the "Code" editor. Delete any existing boilerplate code and paste the entire content of `worker.js`.
3.  **Save and Deploy:** Click "Save" and then "Deploy." The Worker is now live and accessible via your configured route.

### 🔄 Updating the Worker Code

When the core logic of the Worker changes:

1.  **Local Update:** Modify the `cloudflare/worker.js` file locally.
2.  **Copy Code:** Copy the *entire* updated content of `worker.js`.
3.  **Manual Overwrite:** Repeat the deployment steps above (Paste Code, Save, Deploy) to overwrite the existing live code with the new version.

**⚠️ IMPORTANT NOTE:** Because this is a manual process, always verify that the code you are pasting is the complete, final version of your `worker.js` file. Do not rely on automated deployment pipelines for this project.
"
