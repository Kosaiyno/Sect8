"use server";

import { zgStorage } from "@/og-integration/storage";

/**
 * Server Action for 0G Storage
 * Uploads via the 0G SDK and returns the canonical dataRoot/hash
 */
export async function uploadToStorage(data: string) {
  console.log("Server Action: Uploading to 0G Storage...");
  try {
    const dataRoot = await zgStorage.uploadData(data);
    return { success: true, hash: dataRoot };
  } catch (error: unknown) {
    console.error("0G Storage Error:", error);
    // Provide richer error details when available (axios)
    let detail = error instanceof Error ? error.message : String(error);
    try {
      const maybeAxios = error as { response?: { status?: number; data?: unknown } };
      if (maybeAxios.response) {
        detail += ' | status=' + maybeAxios.response.status;
        if (maybeAxios.response.data) detail += ' | data=' + JSON.stringify(maybeAxios.response.data);
      }
    } catch {}
    return { success: false, error: detail };
  }
}
