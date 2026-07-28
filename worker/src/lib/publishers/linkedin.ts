import {
  fetchWithBackoff,
  providerError,
  type Fetcher,
  type PublisherInput,
  type PublisherResult,
} from "./types";

function linkedInHeaders(accessToken: string, version: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Linkedin-Version": version,
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

async function uploadImage(
  input: PublisherInput,
  version: string,
  fetcher: Fetcher,
) {
  if (!input.media) return null;
  if (input.media.mediaType === "video") {
    throw new Error("LinkedIn Phase 1 currently accepts image media only.");
  }
  const initializeResponse = await fetchWithBackoff(
    fetcher,
    "https://api.linkedin.com/rest/images?action=initializeUpload",
    {
      body: JSON.stringify({ initializeUploadRequest: { owner: input.accountId } }),
      headers: {
        ...linkedInHeaders(input.accessToken, version),
        "content-type": "application/json",
      },
      method: "POST",
    },
    "LinkedIn",
  );
  if (!initializeResponse.ok) await providerError(initializeResponse, "LinkedIn", "image initialization");
  const initializeBody = (await initializeResponse.json()) as {
    value?: { image?: string; uploadUrl?: string };
  };
  const imageUrn = initializeBody.value?.image;
  const uploadUrl = initializeBody.value?.uploadUrl;
  if (!imageUrn || !uploadUrl) throw new Error("LinkedIn image initialization returned incomplete upload data.");

  const sourceResponse = await fetchWithBackoff(fetcher, input.media.url, {}, "LinkedIn media source");
  if (!sourceResponse.ok) await providerError(sourceResponse, "LinkedIn", "image download");
  const uploadResponse = await fetchWithBackoff(
    fetcher,
    uploadUrl,
    {
      body: await sourceResponse.arrayBuffer(),
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "content-type": input.media.contentType || sourceResponse.headers.get("content-type") || "image/png",
      },
      method: "PUT",
    },
    "LinkedIn",
  );
  if (!uploadResponse.ok) await providerError(uploadResponse, "LinkedIn", "image upload");
  return imageUrn;
}

export async function publishToLinkedIn(
  input: PublisherInput,
  version: string,
  fetcher: Fetcher = fetch,
): Promise<PublisherResult> {
  if (Array.isArray(input.text)) throw new Error("LinkedIn content must be a single post.");
  const imageUrn = await uploadImage(input, version, fetcher);
  const response = await fetchWithBackoff(
    fetcher,
    "https://api.linkedin.com/rest/posts",
    {
      body: JSON.stringify({
        author: input.accountId,
        commentary: input.text,
        ...(imageUrn
          ? {
              content: {
                media: {
                  altText: input.media?.altText || "Greybrainer film analysis",
                  id: imageUrn,
                },
              },
            }
          : {}),
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        isReshareDisabledByAuthor: false,
        lifecycleState: "PUBLISHED",
        visibility: "PUBLIC",
      }),
      headers: {
        ...linkedInHeaders(input.accessToken, version),
        "content-type": "application/json",
      },
      method: "POST",
    },
    "LinkedIn",
  );
  if (!response.ok) await providerError(response, "LinkedIn", "post creation");
  const bodyText = await response.text();
  const body = bodyText ? (JSON.parse(bodyText) as { id?: string }) : {};
  const postId = response.headers.get("x-restli-id") || body.id;
  if (!postId) throw new Error("LinkedIn did not return a post id.");
  return {
    postId,
    providerResponse: body,
    url: postId.startsWith("urn:li:")
      ? `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}/`
      : null,
  };
}
