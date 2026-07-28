import {
  fetchWithBackoff,
  providerError,
  type Fetcher,
  type PublisherInput,
  type PublisherResult,
} from "./types";

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function uploadMedia(
  accessToken: string,
  media: NonNullable<PublisherInput["media"]>,
  fetcher: Fetcher,
) {
  const mediaResponse = await fetchWithBackoff(fetcher, media.url, {}, "X media source");
  if (!mediaResponse.ok) await providerError(mediaResponse, "X", "media download");
  const bytes = new Uint8Array(await mediaResponse.arrayBuffer());
  const contentType = media.contentType || mediaResponse.headers.get("content-type") || "image/png";
  const mediaCategory = media.mediaType === "video" ? "tweet_video" : "tweet_image";

  const initializeResponse = await fetchWithBackoff(
    fetcher,
    "https://api.x.com/2/media/upload/initialize",
    {
      body: JSON.stringify({
        media_category: mediaCategory,
        media_type: contentType,
        shared: false,
        total_bytes: bytes.byteLength,
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      method: "POST",
    },
    "X",
  );
  if (!initializeResponse.ok) await providerError(initializeResponse, "X", "media initialization");
  const initializeBody = (await initializeResponse.json()) as { data?: { id?: string } };
  const mediaId = initializeBody.data?.id;
  if (!mediaId) throw new Error("X media initialization did not return a media id.");

  const chunkSize = 4 * 1024 * 1024;
  for (let offset = 0, segmentIndex = 0; offset < bytes.length; offset += chunkSize, segmentIndex += 1) {
    const appendResponse = await fetchWithBackoff(
      fetcher,
      `https://api.x.com/2/media/upload/${mediaId}/append`,
      {
        body: JSON.stringify({
          media: bytesToBase64(bytes.slice(offset, offset + chunkSize)),
          segment_index: segmentIndex,
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        method: "POST",
      },
      "X",
    );
    if (!appendResponse.ok) await providerError(appendResponse, "X", "media append");
  }

  const finalizeResponse = await fetchWithBackoff(
    fetcher,
    `https://api.x.com/2/media/upload/${mediaId}/finalize`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      method: "POST",
    },
    "X",
  );
  if (!finalizeResponse.ok) await providerError(finalizeResponse, "X", "media finalization");
  return mediaId;
}

async function createPost(
  accessToken: string,
  text: string,
  fetcher: Fetcher,
  mediaId?: string,
  replyToId?: string,
) {
  if (Array.from(text).length > 280) throw new Error("X posts must not exceed 280 characters.");
  const response = await fetchWithBackoff(
    fetcher,
    "https://api.x.com/2/tweets",
    {
      body: JSON.stringify({
        ...(mediaId ? { media: { media_ids: [mediaId] } } : {}),
        ...(replyToId ? { reply: { in_reply_to_tweet_id: replyToId } } : {}),
        text,
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      method: "POST",
    },
    "X",
  );
  if (!response.ok) await providerError(response, "X", "post creation");
  const body = (await response.json()) as { data?: { id?: string; text?: string } };
  if (!body.data?.id) throw new Error("X did not return a post id.");
  return { body, id: body.data.id };
}

export async function publishToX(input: PublisherInput, fetcher: Fetcher = fetch): Promise<PublisherResult> {
  const posts = Array.isArray(input.text) ? input.text : [input.text];
  if (!posts.length || posts.some((post) => !post.trim())) throw new Error("X content is empty.");
  const mediaId = input.media ? await uploadMedia(input.accessToken, input.media, fetcher) : undefined;
  let replyToId: string | undefined;
  const responses: unknown[] = [];
  for (let index = 0; index < posts.length; index += 1) {
    const result = await createPost(
      input.accessToken,
      posts[index],
      fetcher,
      index === 0 ? mediaId : undefined,
      replyToId,
    );
    replyToId = result.id;
    responses.push(result.body);
  }
  const firstId = ((responses[0] as { data?: { id?: string } })?.data?.id) as string;
  return {
    postId: firstId,
    providerResponse: responses,
    url: `https://x.com/i/web/status/${firstId}`,
  };
}
