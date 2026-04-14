export const apiBase = "https://greybrainer-api.satish-9f4.workers.dev";

export const PUBLIC_JWK = {}; // Replace with actual JWK object after deployment

export const BaasSDK = {
  /**
   * Fetch the latest generated newsletter
   */
  async getLatestNewsletter() {
    try {
      const res = await fetch(`${apiBase}/newsletter/latest`);
      if (!res.ok) throw new Error("Failed to fetch newsletter");
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  }
};
