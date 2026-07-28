import { describe, expect, test } from "bun:test";
import { createClient } from "@libsql/client";
import {
  createWorkersAiGroundingJudge,
  issueGroundingToken,
  verifyGrounding,
  verifyGroundingDeterministic,
  verifyGroundingToken,
  type GroundingDraft,
} from "../src/lib/grounding";
import { producePack } from "../src/lib/produce";
import { claimPublicationJob } from "../src/lib/publicationJobs";
import { getAllowlistedTargetId, publishGrounded } from "../src/lib/publishers";
import { publishToLinkedIn } from "../src/lib/publishers/linkedin";
import { publishToX } from "../src/lib/publishers/x";
import type { GreybrainerReport } from "../src/lib/reports";

const report: GreybrainerReport = {
  cast: [{ actor: "Asha Rao", role: "Mira" }],
  creators: ["Neel Sen"],
  director: "Maya Iyer",
  generatedAt: "2026-07-28T09:00:00.000Z",
  id: "draft_signal_house",
  layerAnalysis: {
    concept: "The orchestration uses a contained design.",
    performance: "The performances carry the emotional pressure.",
    story: "The story is structured around one escalating choice.",
  },
  morphokinetics: {
    keyMoments: [],
    overallSummary: "A steady rise gives way to a brief dip before the final peak.",
  },
  platform: "Example Stream",
  releaseDate: "2026-07-25",
  reportUrl: "https://movies.greybrain.in/reviews/signal-house",
  representativeScenes: [
    "An interpretive corridor of light narrowing around a solitary silhouette.",
  ],
  scores: { concept: 8.2, overall: 7.8, performance: 7.6, story: 7.5 },
  sources: ["https://example.com/source"],
  summary: "A contained drama driven by one escalating choice.",
  title: "Signal House",
  versionId: "version_signal_house_1",
};

describe("closed-book production", () => {
  test("produces bounded platform-native drafts from the report alone", () => {
    const drafts = producePack(report, ["x", "linkedin"]);
    expect(drafts).toHaveLength(2);
    const xDraft = drafts.find((draft) => draft.channel === "x");
    expect(Array.isArray(xDraft?.text)).toBe(true);
    expect((xDraft?.text as string[]).every((post) => Array.from(post).length <= 280)).toBe(true);
    expect(JSON.stringify(drafts)).toContain("8.2");
    expect(JSON.stringify(drafts)).toContain("INTERPRETIVE VISUAL");
  });
});

describe("grounding gate", () => {
  test("accepts the deterministic pack", () => {
    const draft = producePack(report, ["linkedin"])[0];
    expect(verifyGroundingDeterministic(report, draft)).toEqual([]);
  });

  test("rejects a changed score and issues no token", async () => {
    const draft: GroundingDraft = {
      channel: "linkedin",
      text: "Signal House has a Story / Script score of 9.4/10.",
    };
    const result = await verifyGrounding({
      accountId: "urn:li:organization:12345",
      draft,
      judge: async () => [],
      report,
      secret: "test-grounding-secret",
    });
    expect(result.grounded).toBe(false);
    expect(result.token).toBeUndefined();
    expect(result.violations.join(" ")).toContain("stored score 7.5");
  });

  test("rejects an invented cast member and issues no token", async () => {
    const draft: GroundingDraft = {
      channel: "linkedin",
      text: "Signal House stars Tom Hanks alongside Asha Rao.",
    };
    const result = await verifyGrounding({
      accountId: "urn:li:organization:12345",
      draft,
      judge: async () => [],
      report,
      secret: "test-grounding-secret",
    });
    expect(result.grounded).toBe(false);
    expect(result.token).toBeUndefined();
    expect(result.violations.join(" ")).toContain('Tom Hanks');
  });

  test("rejects token tampering and content changes", async () => {
    const draft: GroundingDraft = { channel: "x", text: "Signal House: 7.8/10 Greybrainer Signal." };
    const token = await issueGroundingToken({
      accountId: "12345",
      draft,
      report,
      secret: "test-grounding-secret",
    });
    await expect(
      verifyGroundingToken({
        accountId: "12345",
        channel: "x",
        draft: { ...draft, text: "Signal House: 9.9/10 Greybrainer Signal." },
        secret: "test-grounding-secret",
        token,
      }),
    ).rejects.toThrow("content hash");
    await expect(
      verifyGroundingToken({
        accountId: "12345",
        channel: "x",
        draft,
        secret: "test-grounding-secret",
        token: `${token.slice(0, -1)}x`,
      }),
    ).rejects.toThrow("signature");
  });

  test("accepts a schema-constrained Workers AI object response", async () => {
    const judge = await createWorkersAiGroundingJudge({
      AI: {
        run: async () => ({ response: { violations: [] } }),
      },
      GROUNDING_JUDGE_MODEL: "@cf/google/gemma-4-26b-a4b-it",
    } as never);
    const draft = producePack(report, ["linkedin"])[0];
    expect(await judge(report, draft)).toEqual([]);
  });

  test("accepts the current Workers AI chat-completions response envelope", async () => {
    const judge = await createWorkersAiGroundingJudge({
      AI: {
        run: async () => ({
          choices: [
            {
              message: {
                content: '{"violations":[]}',
                role: "assistant",
              },
            },
          ],
        }),
      },
      GROUNDING_JUDGE_MODEL: "@cf/google/gemma-4-26b-a4b-it",
    } as never);
    const draft = producePack(report, ["linkedin"])[0];
    expect(await judge(report, draft)).toEqual([]);
  });

  test("sends only the fact-lock and draft to the secondary judge", async () => {
    let judgeInput: unknown;
    const judge = await createWorkersAiGroundingJudge({
      AI: {
        run: async (_model: unknown, input: unknown) => {
          judgeInput = input;
          return { response: { violations: [] } };
        },
      },
      GROUNDING_JUDGE_MODEL: "@cf/google/gemma-4-26b-a4b-it",
    } as never);
    const draft = producePack(report, ["linkedin"])[0];
    expect(await judge(report, draft)).toEqual([]);
    const messages = (judgeInput as { messages: Array<{ content: string }> }).messages;
    const userPayload = JSON.parse(messages[1].content) as Record<string, unknown>;
    const serializedPayload = JSON.stringify(userPayload);
    expect(userPayload.FACT_LOCK).toBeDefined();
    expect(serializedPayload).not.toContain(report.summary);
    expect(serializedPayload).not.toContain(report.layerAnalysis.story);
    expect(serializedPayload).not.toContain(report.representativeScenes[0]);
  });

  test("publish refuses a missing grounding token before any provider or database call", async () => {
    await expect(
      publishGrounded({
        channel: "x",
        client: {} as never,
        draft: { channel: "x", text: "Signal House: 7.8/10 Greybrainer Signal." },
        env: {
          GREYBRAINER_HANDLE_ALLOWLIST: JSON.stringify({ x: "99887766" }),
          GROUNDING_HMAC_SECRET: "test-grounding-secret",
        } as never,
        groundingToken: "",
      }),
    ).rejects.toThrow("invalid format");
  });
});

describe("brand isolation", () => {
  test("requires exact provider account identifiers", () => {
    const env = {
      GREYBRAINER_HANDLE_ALLOWLIST: JSON.stringify({
        linkedin: "urn:li:organization:12345",
        x: "99887766",
      }),
    };
    expect(getAllowlistedTargetId(env as never, "x")).toBe("99887766");
    expect(getAllowlistedTargetId(env as never, "linkedin")).toBe("urn:li:organization:12345");
    expect(() =>
      getAllowlistedTargetId(
        { GREYBRAINER_HANDLE_ALLOWLIST: JSON.stringify({ x: "@clinical-brand" }) } as never,
        "x",
      ),
    ).toThrow("numeric Greybrainer user id");
  });
});

describe("durable publication jobs", () => {
  test("allows only one worker to claim a due post", async () => {
    const client = createClient({ url: "file::memory:" });
    await client.execute(`
      CREATE TABLE publication_jobs (
        id TEXT PRIMARY KEY,
        draft_id TEXT NOT NULL,
        version_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        target_account_id TEXT NOT NULL,
        content_json TEXT NOT NULL,
        media_json TEXT,
        grounding_token_hash TEXT NOT NULL,
        scheduled_at TEXT,
        status TEXT NOT NULL,
        external_id TEXT,
        external_url TEXT,
        error_message TEXT,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        published_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    const now = new Date().toISOString();
    await client.execute({
      sql: `
        INSERT INTO publication_jobs (
          id, draft_id, version_id, channel, target_account_id, content_json,
          grounding_token_hash, scheduled_at, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        "post_due",
        report.id,
        report.versionId,
        "x",
        "99887766",
        JSON.stringify({ channel: "x", text: "Grounded copy" }),
        "token-hash",
        new Date(Date.now() - 60_000).toISOString(),
        "scheduled",
        now,
        now,
      ],
    });

    const claims = await Promise.all([
      claimPublicationJob(client, "post_due"),
      claimPublicationJob(client, "post_due"),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(claims.find(Boolean)?.status).toBe("publishing");
    expect(claims.find(Boolean)?.attemptCount).toBe(1);
    client.close();
  });
});

describe("provider request contracts", () => {
  test("publishes an X thread with reply chaining", async () => {
    const requests: Array<{ body: unknown; url: string }> = [];
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input);
      requests.push({ body: init?.body ? JSON.parse(String(init.body)) : null, url });
      return new Response(
        JSON.stringify({ data: { id: String(100 + requests.length), text: "ok" } }),
        { headers: { "content-type": "application/json" }, status: 201 },
      );
    };
    const result = await publishToX(
      { accessToken: "token", accountId: "99887766", text: ["First", "Second"] },
      fetcher,
    );
    expect(result.postId).toBe("101");
    expect(requests).toHaveLength(2);
    expect(requests[1].body).toEqual({
      reply: { in_reply_to_tweet_id: "101" },
      text: "Second",
    });
  });

  test("publishes a LinkedIn organization post", async () => {
    const fetcher: typeof fetch = async (_input, init) => {
      expect(JSON.parse(String(init?.body))).toMatchObject({
        author: "urn:li:organization:12345",
        commentary: "Grounded copy",
        lifecycleState: "PUBLISHED",
      });
      return new Response("", {
        headers: { "x-restli-id": "urn:li:share:123" },
        status: 201,
      });
    };
    const result = await publishToLinkedIn(
      {
        accessToken: "token",
        accountId: "urn:li:organization:12345",
        text: "Grounded copy",
      },
      "202606",
      fetcher,
    );
    expect(result.postId).toBe("urn:li:share:123");
  });
});
