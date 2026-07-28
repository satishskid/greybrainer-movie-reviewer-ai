import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import * as z from "zod/v4";
import { createDbClient, type Env } from "./db";
import {
  createWorkersAiGroundingJudge,
  verifyGrounding,
  type GroundingDraft,
  type PublishMedia,
} from "./grounding";
import {
  getPublicationJob,
  listScheduledPublicationJobs,
} from "./publicationJobs";
import { ensureOmnichannelSchema } from "./omnichannelSchema";
import { producePack, type PhaseOneChannel } from "./produce";
import {
  getAllowlistedTargetId,
  publishGrounded,
} from "./publishers";
import { getReport, listReports } from "./reports";

const channelSchema = z.enum(["x", "linkedin"]);
const mediaSchema = z.object({
  altText: z.string().optional(),
  contentType: z.string().optional(),
  mediaType: z.enum(["image", "video"]).optional(),
  url: z.string().url(),
});
const draftSchema = z.object({
  channel: channelSchema,
  hashtags: z.array(z.string()).optional(),
  media: mediaSchema.nullish(),
  text: z.union([z.string(), z.array(z.string())]),
});
const publishContentSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.object({
    hashtags: z.array(z.string()).optional(),
    text: z.union([z.string(), z.array(z.string())]),
  }),
]);

function jsonToolResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function toolFailure(error: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          error: error instanceof Error ? error.message : "Unexpected Greybrainer MCP error.",
        }),
      },
    ],
    isError: true,
  };
}

function normalizePublishDraft(
  channel: PhaseOneChannel,
  content: z.infer<typeof publishContentSchema>,
  media?: PublishMedia | null,
): GroundingDraft {
  if (typeof content === "string" || Array.isArray(content)) {
    return { channel, hashtags: [], media: media ?? null, text: content };
  }
  return {
    channel,
    hashtags: content.hashtags ?? [],
    media: media ?? null,
    text: content.text,
  };
}

async function createReadyClient(env: Env) {
  const client = createDbClient(env);
  try {
    await ensureOmnichannelSchema(client);
    return client;
  } catch (error) {
    client.close();
    throw error;
  }
}

function createGreybrainerMcpServer(env: Env) {
  const server = new McpServer({
    name: "greybrainer-omnichannel",
    version: env.OMNICHANNEL_API_VERSION ?? "1.0.0",
  });

  server.registerTool(
    "list_reports",
    {
      description: "List stored Greybrainer canonical film-analysis reports.",
      inputSchema: {
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
      title: "List Greybrainer reports",
    },
    async ({ cursor, limit }) => {
      const client = await createReadyClient(env);
      try {
        return jsonToolResult(await listReports(client, limit ?? 20, cursor ?? null));
      } catch (error) {
        return toolFailure(error);
      } finally {
        client.close();
      }
    },
  );

  server.registerTool(
    "get_report",
    {
      description: "Get the complete stored canonical report used as the publishing fact-lock.",
      inputSchema: { id: z.string().min(1) },
      title: "Get Greybrainer report",
    },
    async ({ id }) => {
      const client = await createReadyClient(env);
      try {
        const report = await getReport(client, id);
        return report ? jsonToolResult(report) : toolFailure(new Error("Report not found."));
      } catch (error) {
        return toolFailure(error);
      } finally {
        client.close();
      }
    },
  );

  server.registerTool(
    "produce_pack",
    {
      description: "Produce deterministic, closed-book X and LinkedIn drafts from one stored report.",
      inputSchema: {
        channels: z.array(channelSchema).min(1),
        report_id: z.string().min(1),
      },
      title: "Produce grounded channel pack",
    },
    async ({ channels, report_id }) => {
      const client = await createReadyClient(env);
      try {
        const report = await getReport(client, report_id);
        if (!report) throw new Error("Report not found.");
        return jsonToolResult({
          drafts: producePack(report, channels),
          factLockReportId: report.id,
          reportVersionId: report.versionId,
        });
      } catch (error) {
        return toolFailure(error);
      } finally {
        client.close();
      }
    },
  );

  server.registerTool(
    "verify_grounding",
    {
      description: "Check a draft against the canonical report and issue a short-lived signed token only when fully grounded.",
      inputSchema: {
        draft: draftSchema,
        report_id: z.string().min(1),
      },
      title: "Verify report grounding",
    },
    async ({ draft, report_id }) => {
      const client = await createReadyClient(env);
      try {
        if (!env.GROUNDING_HMAC_SECRET) throw new Error("GROUNDING_HMAC_SECRET is not configured.");
        const report = await getReport(client, report_id);
        if (!report) throw new Error("Report not found.");
        const accountId = getAllowlistedTargetId(env, draft.channel);
        const judge = await createWorkersAiGroundingJudge(env);
        return jsonToolResult(
          await verifyGrounding({
            accountId,
            draft,
            judge,
            report,
            secret: env.GROUNDING_HMAC_SECRET,
            ttlSeconds: Number(env.GROUNDING_TOKEN_TTL_SECONDS ?? "900"),
          }),
        );
      } catch (error) {
        return toolFailure(error);
      } finally {
        client.close();
      }
    },
  );

  server.registerTool(
    "publish",
    {
      description: "Publish token-bound content to the fixed Greybrainer X or LinkedIn account, immediately or on schedule.",
      inputSchema: {
        channel: channelSchema,
        content: publishContentSchema,
        grounding_token: z.string().min(1),
        media: mediaSchema.nullish(),
        schedule: z.string().datetime({ offset: true }).optional(),
      },
      title: "Publish grounded Greybrainer post",
    },
    async ({ channel, content, grounding_token, media, schedule }) => {
      const client = await createReadyClient(env);
      try {
        return jsonToolResult(
          await publishGrounded({
            channel,
            client,
            draft: normalizePublishDraft(channel, content, media),
            env,
            groundingToken: grounding_token,
            schedule: schedule ?? null,
          }),
        );
      } catch (error) {
        return toolFailure(error);
      } finally {
        client.close();
      }
    },
  );

  server.registerTool(
    "list_scheduled",
    {
      description: "List Greybrainer publication jobs waiting for their scheduled send time.",
      inputSchema: {},
      title: "List scheduled posts",
    },
    async () => {
      const client = await createReadyClient(env);
      try {
        return jsonToolResult({ posts: await listScheduledPublicationJobs(client) });
      } catch (error) {
        return toolFailure(error);
      } finally {
        client.close();
      }
    },
  );

  server.registerTool(
    "get_status",
    {
      description: "Get the current status and provider result for one Greybrainer publication job.",
      inputSchema: { post_id: z.string().min(1) },
      title: "Get publication status",
    },
    async ({ post_id }) => {
      const client = await createReadyClient(env);
      try {
        const post = await getPublicationJob(client, post_id);
        return post ? jsonToolResult(post) : toolFailure(new Error("Publication job not found."));
      } catch (error) {
        return toolFailure(error);
      } finally {
        client.close();
      }
    },
  );

  return server;
}

async function constantTimeEqual(left: string, right: string) {
  const digest = async (value: string) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  const [leftDigest, rightDigest] = await Promise.all([digest(left), digest(right)]);
  let mismatch = 0;
  for (let index = 0; index < leftDigest.length; index += 1) {
    mismatch |= leftDigest[index] ^ rightDigest[index];
  }
  return mismatch === 0;
}

export async function isMcpAuthorized(request: Request, env: Env) {
  const required = env.MCP_API_TOKEN?.trim();
  if (!required) return false;
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
  return token ? constantTimeEqual(token, required) : false;
}

export async function handleMcpRequest(request: Request, env: Env) {
  const transport = new WebStandardStreamableHTTPServerTransport();
  const server = createGreybrainerMcpServer(env);
  await server.connect(transport);
  return transport.handleRequest(request);
}
