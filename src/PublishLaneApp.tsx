import React, { useEffect, useMemo, useState } from 'react';
import { AuthWrapper } from '../components/AuthWrapper';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  getDraft,
  listDrafts,
  listPostizIntegrations,
  listSocialAccounts,
  publishDraftThroughLane,
  saveDraftVersion,
  type DraftRecord,
  type PostizIntegrationRecord,
  type PublishLaneAuthType,
  type PublishLaneChannelMode,
  type PublishLaneResult,
  type SocialAccountRecord,
  updateDraftRecord,
} from '../services/omnichannelDraftService';

type ChannelKey = 'medium' | 'linkedin' | 'x' | 'facebook' | 'instagram';

interface ChannelDraft {
  apiKey: string;
  authHeaderName: string;
  authType: PublishLaneAuthType;
  channel: ChannelKey;
  enabled: boolean;
  endpointUrl: string;
  mode: PublishLaneChannelMode;
  postizIntegrationId: string;
  postizType: string;
  postizUploadMedia: boolean;
  socialAccountId: string;
}

interface PublishPack {
  articleMarkdown: string;
  excerpt: string;
  facebookCopy: string;
  hashtagsText: string;
  heroImageUrl: string;
  instagramCopy: string;
  linkedinCopy: string;
  mediumCopy: string;
  posterImageUrl: string;
  seoDescription: string;
  seoTitle: string;
  slug: string;
  tagsText: string;
  thumbnailImageUrl: string;
  title: string;
  xCopy: string;
}

const CHANNEL_LABELS: Record<ChannelKey, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  medium: 'Medium',
  x: 'X',
};

const POSTIZ_BASE_URL = 'https://api.postiz.com/public/v1';
const POSTIZ_POSTS_URL = `${POSTIZ_BASE_URL}/posts`;
const SOCIAL_HANDLE_HINTS: Partial<Record<ChannelKey, string>> = {
  instagram: 'greybrainlens',
  linkedin: 'greybrainer',
  medium: 'GreyBrainer',
  x: 'Greybrainlens',
};

const DEFAULT_CHANNELS: ChannelDraft[] = [
  { apiKey: '', authHeaderName: '', authType: 'none', channel: 'medium', enabled: true, endpointUrl: POSTIZ_POSTS_URL, mode: 'postiz', postizIntegrationId: '', postizType: 'medium', postizUploadMedia: false, socialAccountId: '' },
  { apiKey: '', authHeaderName: '', authType: 'none', channel: 'linkedin', enabled: true, endpointUrl: POSTIZ_POSTS_URL, mode: 'postiz', postizIntegrationId: '', postizType: 'linkedin', postizUploadMedia: true, socialAccountId: '' },
  { apiKey: '', authHeaderName: '', authType: 'none', channel: 'x', enabled: false, endpointUrl: POSTIZ_POSTS_URL, mode: 'postiz', postizIntegrationId: '', postizType: 'x', postizUploadMedia: false, socialAccountId: '' },
  { apiKey: '', authHeaderName: '', authType: 'none', channel: 'facebook', enabled: false, endpointUrl: POSTIZ_POSTS_URL, mode: 'postiz', postizIntegrationId: '', postizType: 'facebook', postizUploadMedia: true, socialAccountId: '' },
  { apiKey: '', authHeaderName: '', authType: 'none', channel: 'instagram', enabled: false, endpointUrl: POSTIZ_POSTS_URL, mode: 'postiz', postizIntegrationId: '', postizType: 'instagram', postizUploadMedia: true, socialAccountId: '' },
];

const CHANNEL_STORAGE_KEY = 'gb_publish_lane_channels_v1';
const POSTIZ_SETTINGS_STORAGE_KEY = 'gb_publish_lane_postiz_settings_v1';

function getPathDraftId() {
  const normalizedPath = window.location.pathname.replace(/^\/engine(?=\/|$)/, '') || '/';
  const parts = normalizedPath.split('/').filter(Boolean);
  return parts[0] === 'studio' && parts[1] === 'publish-lane' && parts[2] ? decodeURIComponent(parts[2]) : null;
}

function appPath(path: string) {
  const base = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  const sliced = normalized.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${sliced.slice(0, lastSpace > 40 ? lastSpace : sliced.length).trim()}.`;
}

function splitList(value: string) {
  return value
    .split(/[,#\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hashtag(value: string) {
  const clean = value.replace(/[^a-z0-9]/gi, '').trim();
  return clean ? `#${clean.slice(0, 40)}` : '';
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function firstParagraph(markdown: string) {
  const paragraph = markdown
    .split(/\n{2,}/)
    .map((line) => stripMarkdown(line))
    .find((line) => line.length > 80);
  return paragraph ?? stripMarkdown(markdown).slice(0, 240);
}

function extractKeywords(title: string, plainText: string) {
  const stopWords = new Set([
    'about', 'after', 'again', 'analysis', 'because', 'between', 'cinema', 'could', 'every', 'film',
    'from', 'greybrainer', 'into', 'movie', 'review', 'story', 'that', 'their', 'there', 'this',
    'through', 'what', 'when', 'where', 'which', 'with',
  ]);
  const words = `${title} ${plainText}`
    .toLowerCase()
    .match(/[a-z][a-z0-9]{3,}/g) ?? [];
  const counts = new Map<string, number>();
  for (const word of words) {
    if (!stopWords.has(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function getString(source: unknown, path: string[]) {
  let cursor = source;
  for (const part of path) {
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) return '';
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return typeof cursor === 'string' ? cursor : '';
}

function getSourcePayload(draft: DraftRecord | null) {
  const sourcePayload = draft?.currentVersion?.sourcePayload;
  return sourcePayload && typeof sourcePayload === 'object' && !Array.isArray(sourcePayload)
    ? (sourcePayload as Record<string, unknown>)
    : {};
}

function buildXThread(title: string, excerpt: string, canonicalHint: string) {
  const intro = clampText(`Greybrainer Lens: ${title}. ${excerpt}`, 250);
  const second = clampText('We read the film through story architecture, conceptual force, performance signals, and morphokinetic audience movement.', 260);
  const third = clampText(`Full review: ${canonicalHint || 'link after publish'}`, 250);
  return [intro, second, third].join('\n\n');
}

function buildInitialPack(draft: DraftRecord): PublishPack {
  const sourcePayload = getSourcePayload(draft);
  const markdown = draft.currentVersion?.blogMarkdown ?? '';
  const plainText = stripMarkdown(markdown);
  const title = draft.seoTitle || draft.subjectTitle;
  const excerpt = draft.seoDescription || clampText(firstParagraph(markdown), 155);
  const keywords = extractKeywords(title, plainText);
  const tags = unique(['Greybrainer', 'Film Analysis', 'Movie Review', draft.reviewStage ?? '', ...keywords]).slice(0, 10);
  const hashtags = unique([
    '#Greybrainer',
    '#FilmAnalysis',
    '#MovieReview',
    hashtag(draft.subjectTitle),
    ...keywords.slice(0, 4).map(hashtag),
  ]).filter(Boolean);
  const canonicalHint = draft.websiteUrl ?? '';
  const heroImageUrl = getString(sourcePayload, ['heroImageUrl']) || getString(sourcePayload, ['image', 'heroUrl']);
  const posterImageUrl = getString(sourcePayload, ['posterImageUrl']) || getString(sourcePayload, ['image', 'posterUrl']);
  const thumbnailImageUrl = getString(sourcePayload, ['thumbnailImageUrl']) || getString(sourcePayload, ['image', 'thumbnailUrl']);

  return {
    articleMarkdown: markdown,
    excerpt,
    facebookCopy: [
      `${title}`,
      '',
      excerpt,
      '',
      `Greybrainer Lens looks at what is happening below the surface: story, performance, concept, and audience movement.`,
      canonicalHint || 'Link will be attached after website publish.',
    ].join('\n'),
    hashtagsText: hashtags.join(' '),
    heroImageUrl,
    instagramCopy: [
      `${title}`,
      '',
      excerpt,
      '',
      'A Greybrainer Lens note on craft, emotional movement, and the deeper signals behind audience response.',
      '',
      hashtags.join(' '),
    ].join('\n'),
    linkedinCopy: [
      `${title}`,
      '',
      excerpt,
      '',
      'Greybrainer reads films through three practical lenses:',
      '- Story architecture',
      '- Conceptual force',
      '- Performance and morphokinetic audience movement',
      '',
      canonicalHint ? `Read the full review: ${canonicalHint}` : 'Full review link will be added after website publish.',
    ].join('\n'),
    mediumCopy: markdown,
    posterImageUrl,
    seoDescription: excerpt,
    seoTitle: clampText(title, 64),
    slug: slugify(title),
    tagsText: tags.join(', '),
    thumbnailImageUrl,
    title,
    xCopy: buildXThread(title, excerpt, canonicalHint),
  };
}

function restoreChannelSettings(accounts: SocialAccountRecord[]) {
  let stored: Partial<ChannelDraft>[] = [];
  try {
    stored = JSON.parse(localStorage.getItem(CHANNEL_STORAGE_KEY) || '[]') as Partial<ChannelDraft>[];
  } catch {
    stored = [];
  }

  return DEFAULT_CHANNELS.map((channel) => {
    const saved = stored.find((item) => item.channel === channel.channel);
    const matchingNativeAccount = accounts.find((account) => account.platform === channel.channel && account.connectionStatus === 'connected');
    return {
      ...channel,
      ...saved,
      apiKey: '',
      socialAccountId: saved?.socialAccountId || matchingNativeAccount?.id || '',
    };
  });
}

function persistChannelSettings(channels: ChannelDraft[]) {
  const safeChannels = channels.map(({ apiKey: _apiKey, ...channel }) => channel);
  localStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(safeChannels));
}

function channelCopy(pack: PublishPack, channel: ChannelKey) {
  if (channel === 'medium') return pack.mediumCopy;
  if (channel === 'linkedin') return pack.linkedinCopy;
  if (channel === 'x') return pack.xCopy.split(/\n{2,}/).filter(Boolean);
  if (channel === 'facebook') return pack.facebookCopy;
  return pack.instagramCopy;
}

function resultTone(status: string) {
  if (status === 'published') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100';
  if (status === 'ready') return 'border-sky-500/40 bg-sky-500/10 text-sky-100';
  if (status === 'skipped') return 'border-slate-700 bg-slate-900/70 text-slate-300';
  return 'border-red-500/40 bg-red-500/10 text-red-100';
}

function postizIdentifiersForChannel(channel: ChannelKey) {
  if (channel === 'linkedin') return ['linkedin-page', 'linkedin'];
  if (channel === 'instagram') return ['instagram', 'instagram-standalone'];
  return [channel];
}

function channelFromPostizIdentifier(identifier: string): ChannelKey | null {
  if (identifier === 'linkedin' || identifier === 'linkedin-page') return 'linkedin';
  if (identifier === 'instagram' || identifier === 'instagram-standalone') return 'instagram';
  if (identifier === 'medium' || identifier === 'x' || identifier === 'facebook') return identifier;
  return null;
}

function integrationLabel(integration: PostizIntegrationRecord) {
  return [
    integration.name,
    integration.profile ? `@${integration.profile}` : null,
    integration.identifier,
    integration.disabled ? 'disabled' : null,
  ].filter(Boolean).join(' - ');
}

function matchingIntegrations(integrations: PostizIntegrationRecord[], channel: ChannelKey) {
  const identifiers = postizIdentifiersForChannel(channel);
  return integrations.filter((integration) => identifiers.includes(integration.identifier));
}

function normalizeHandle(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/medium\.com\/@?/, '')
    .replace(/linkedin\.com\/company\//, '')
    .replace(/x\.com\//, '')
    .replace(/twitter\.com\//, '')
    .replace(/instagram\.com\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '')
    .replace(/[^a-z0-9._-]/g, '');
}

function integrationMatchesHint(integration: PostizIntegrationRecord, hint?: string) {
  const normalizedHint = normalizeHandle(hint);
  if (!normalizedHint) return false;
  return [integration.profile, integration.name]
    .map(normalizeHandle)
    .filter(Boolean)
    .some((value) => value === normalizedHint || value.includes(normalizedHint) || normalizedHint.includes(value));
}

function readPostizSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(POSTIZ_SETTINGS_STORAGE_KEY) || '{}') as {
      baseUrl?: string;
      group?: string;
    };
    return {
      baseUrl: parsed.baseUrl || POSTIZ_BASE_URL,
      group: parsed.group || '',
    };
  } catch {
    return {
      baseUrl: POSTIZ_BASE_URL,
      group: '',
    };
  }
}

function getWebsiteStatus(result: PublishLaneResult) {
  if (!result.website) return 'skipped';
  if ('publication' in result.website) return result.website.publication.status;
  return result.website.status;
}

function buildAuthorPackObject(draft: DraftRecord, pack: PublishPack, channels: ChannelDraft[]) {
  const enabledChannels = channels
    .filter((channel) => channel.enabled)
    .map((channel) => ({
      channel: channel.channel,
      label: CHANNEL_LABELS[channel.channel],
      mode: channel.mode,
      postizIntegrationId: channel.postizIntegrationId || null,
      postizType: channel.postizType || null,
      targetHint: SOCIAL_HANDLE_HINTS[channel.channel] ?? null,
    }));

  return {
    article: {
      draftId: draft.id,
      excerpt: pack.excerpt,
      markdown: pack.articleMarkdown,
      slug: pack.slug,
      title: pack.title,
      websiteUrl: draft.websiteUrl ?? null,
    },
    images: {
      heroImageUrl: pack.heroImageUrl || null,
      posterImageUrl: pack.posterImageUrl || null,
      thumbnailImageUrl: pack.thumbnailImageUrl || null,
    },
    instructions: [
      'Publish the website article first so the final URL can be included in social captions.',
      'Use Medium for the full article version if available.',
      'Use LinkedIn for the producer/director-facing professional post.',
      'Use X as a thread; keep each paragraph as one post.',
      'Use Instagram/Facebook captions with the thumbnail or hero image.',
      'Do not rewrite unless a factual correction is needed.',
    ],
    seo: {
      description: pack.seoDescription,
      hashtags: splitList(pack.hashtagsText).map((item) => item.startsWith('#') ? item : hashtag(item)).filter(Boolean),
      tags: splitList(pack.tagsText),
      title: pack.seoTitle,
    },
    social: {
      facebook: pack.facebookCopy,
      instagram: pack.instagramCopy,
      linkedin: pack.linkedinCopy,
      medium: pack.mediumCopy,
      xThread: pack.xCopy.split(/\n{2,}/).filter(Boolean),
    },
    targets: enabledChannels,
  };
}

function buildAuthorPackMarkdown(draft: DraftRecord, pack: PublishPack, channels: ChannelDraft[]) {
  const handoff = buildAuthorPackObject(draft, pack, channels);
  return [
    `# Greybrainer Author Pack: ${handoff.article.title}`,
    '',
    '## Publish Instructions',
    ...handoff.instructions.map((item) => `- ${item}`),
    '',
    '## SEO',
    `Title: ${handoff.seo.title}`,
    `Slug: ${handoff.article.slug}`,
    `Description: ${handoff.seo.description}`,
    `Tags: ${handoff.seo.tags.join(', ') || 'None'}`,
    `Hashtags: ${handoff.seo.hashtags.join(' ') || 'None'}`,
    '',
    '## Image URLs',
    `Hero: ${handoff.images.heroImageUrl ?? 'Not set'}`,
    `Poster: ${handoff.images.posterImageUrl ?? 'Not set'}`,
    `Thumbnail: ${handoff.images.thumbnailImageUrl ?? 'Not set'}`,
    '',
    '## Targets',
    ...handoff.targets.map((target) => `- ${target.label}: ${target.targetHint ? `@${target.targetHint}` : 'manual target'} (${target.mode})`),
    '',
    '## Website Article',
    handoff.article.markdown,
    '',
    '## Medium',
    handoff.social.medium,
    '',
    '## LinkedIn',
    handoff.social.linkedin,
    '',
    '## X Thread',
    ...handoff.social.xThread.map((post, index) => `### Post ${index + 1}\n${post}`),
    '',
    '## Facebook',
    handoff.social.facebook,
    '',
    '## Instagram',
    handoff.social.instagram,
    '',
  ].join('\n');
}

export const PublishLaneApp: React.FC = () => {
  return (
    <AuthWrapper>
      {(user) => <PublishLaneInner currentUserEmail={user?.email ?? null} />}
    </AuthWrapper>
  );
};

const PublishLaneInner: React.FC<{ currentUserEmail: string | null }> = ({ currentUserEmail }) => {
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(() => getPathDraftId());
  const [draft, setDraft] = useState<DraftRecord | null>(null);
  const [accounts, setAccounts] = useState<SocialAccountRecord[]>([]);
  const [channels, setChannels] = useState<ChannelDraft[]>(DEFAULT_CHANNELS);
  const [pack, setPack] = useState<PublishPack | null>(null);
  const [publishWebsite, setPublishWebsite] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [busy, setBusy] = useState<'save' | 'dry-run' | 'publish' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishLaneResult | null>(null);
  const [postizApiKey, setPostizApiKey] = useState('');
  const [postizBaseUrl, setPostizBaseUrl] = useState(() => readPostizSettings().baseUrl);
  const [postizGroup, setPostizGroup] = useState(() => readPostizSettings().group);
  const [postizIntegrations, setPostizIntegrations] = useState<PostizIntegrationRecord[]>([]);
  const [isFetchingPostiz, setIsFetchingPostiz] = useState(false);

  const loadDrafts = async () => {
    setLoadingDrafts(true);
    setError(null);
    try {
      const [draftRecords, accountRecords] = await Promise.all([listDrafts(100), listSocialAccounts()]);
      setDrafts(draftRecords);
      setAccounts(accountRecords);
      setChannels(restoreChannelSettings(accountRecords));
      setSelectedDraftId((current) => current ?? draftRecords[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load publishing lane.');
    } finally {
      setLoadingDrafts(false);
    }
  };

  useEffect(() => {
    void loadDrafts();
  }, []);

  useEffect(() => {
    persistChannelSettings(channels);
  }, [channels]);

  useEffect(() => {
    localStorage.setItem(POSTIZ_SETTINGS_STORAGE_KEY, JSON.stringify({
      baseUrl: postizBaseUrl,
      group: postizGroup,
    }));
  }, [postizBaseUrl, postizGroup]);

  useEffect(() => {
    if (!selectedDraftId) {
      setDraft(null);
      setPack(null);
      return;
    }

    let active = true;
    const loadSelectedDraft = async () => {
      setLoadingDraft(true);
      setError(null);
      try {
        const nextDraft = await getDraft(selectedDraftId);
        if (!active) return;
        setDraft(nextDraft);
        setPack(buildInitialPack(nextDraft));
        setResult(null);
        const nextPath = appPath(`/studio/publish-lane/${nextDraft.id}`);
        if (window.location.pathname !== nextPath) {
          window.history.replaceState(null, '', nextPath);
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load selected draft.');
      } finally {
        if (active) setLoadingDraft(false);
      }
    };

    void loadSelectedDraft();
    return () => {
      active = false;
    };
  }, [selectedDraftId]);

  const selectedChannelCount = useMemo(() => channels.filter((channel) => channel.enabled).length, [channels]);
  const tags = useMemo(() => splitList(pack?.tagsText ?? ''), [pack?.tagsText]);
  const hashtags = useMemo(() => splitList(pack?.hashtagsText ?? '').map((item) => item.startsWith('#') ? item : hashtag(item)).filter(Boolean), [pack?.hashtagsText]);

  const checklist = useMemo(() => {
    const enabled = channels.filter((channel) => channel.enabled);
    return [
      { label: 'Article copy saved in this lane', ok: Boolean(pack?.articleMarkdown && pack.articleMarkdown.length > 300) },
      { label: 'SEO title under 65 characters', ok: Boolean(pack?.seoTitle && pack.seoTitle.length <= 65) },
      { label: 'SEO description between 90 and 160 characters', ok: Boolean(pack?.seoDescription && pack.seoDescription.length >= 90 && pack.seoDescription.length <= 160) },
      { label: 'At least one social channel selected', ok: enabled.length > 0 },
      {
        label: 'Selected channels have native account or endpoint',
        ok: enabled.every((channel) => {
          if (channel.mode === 'native') return Boolean(channel.socialAccountId);
          if (channel.mode === 'postiz') return Boolean((channel.apiKey.trim() || postizApiKey.trim()) && channel.postizIntegrationId.trim() && channel.endpointUrl.trim());
          return Boolean(channel.endpointUrl.trim());
        }),
      },
    ];
  }, [channels, pack, postizApiKey]);

  const updatePack = (updates: Partial<PublishPack>) => {
    setPack((current) => (current ? { ...current, ...updates } : current));
  };

  const updateChannel = (channelKey: ChannelKey, updates: Partial<ChannelDraft>) => {
    setChannels((current) => current.map((channel) => channel.channel === channelKey ? { ...channel, ...updates } : channel));
  };

  const buildPayloadPack = (activePack: PublishPack) => ({
    articleMarkdown: activePack.articleMarkdown,
    canonicalUrl: draft?.websiteUrl ?? null,
    excerpt: activePack.excerpt,
    hashtags,
    media: {
      heroImageUrl: activePack.heroImageUrl || null,
      posterImageUrl: activePack.posterImageUrl || null,
      thumbnailImageUrl: activePack.thumbnailImageUrl || null,
    },
    seoDescription: activePack.seoDescription,
    seoTitle: activePack.seoTitle,
    slug: activePack.slug,
    tags,
    title: activePack.title,
  });

  const buildChannelPayload = (activePack: PublishPack) =>
    channels
      .filter((channel) => channel.enabled)
      .map((channel) => ({
        apiKey: channel.apiKey || (channel.mode === 'postiz' ? postizApiKey : '') || null,
        authHeaderName: channel.authHeaderName || null,
        authType: channel.authType,
        channel: channel.channel,
        copy: channelCopy(activePack, channel.channel),
        enabled: channel.enabled,
        endpointUrl: channel.endpointUrl || null,
        mode: channel.mode,
        postizIntegrationId: channel.postizIntegrationId || null,
        postizType: channel.postizType || null,
        postizUploadMedia: channel.postizUploadMedia,
        socialAccountId: channel.socialAccountId || null,
        tags: hashtags,
      }));

  const applyPostizIntegrations = (integrations: PostizIntegrationRecord[]) => {
    setChannels((current) => current.map((channel) => {
      const matches = matchingIntegrations(integrations, channel.channel);
      const existing = matches.find((integration) => integration.id === channel.postizIntegrationId);
      const hinted = matches.find((integration) =>
        !integration.disabled && integrationMatchesHint(integration, SOCIAL_HANDLE_HINTS[channel.channel])
      );
      const firstActive = matches.find((integration) => !integration.disabled);
      const selected = existing ?? hinted ?? firstActive ?? matches[0];
      if (!selected) {
        return {
          ...channel,
          endpointUrl: postizBaseUrl || POSTIZ_BASE_URL,
          mode: channel.mode === 'native' ? channel.mode : 'postiz',
        };
      }

      return {
        ...channel,
        endpointUrl: postizBaseUrl || POSTIZ_BASE_URL,
        enabled: true,
        mode: 'postiz',
        postizIntegrationId: selected.id,
        postizType: selected.identifier,
      };
    }));
  };

  const handleFetchPostizIntegrations = async () => {
    if (!postizApiKey.trim()) {
      setError('Paste the Postiz API key first.');
      return;
    }

    setIsFetchingPostiz(true);
    setError(null);
    setMessage(null);
    try {
      const integrations = await listPostizIntegrations({
        apiKey: postizApiKey,
        baseUrl: postizBaseUrl,
        group: postizGroup || null,
      });
      setPostizIntegrations(integrations);
      applyPostizIntegrations(integrations);
      const mappedCount = integrations.filter((integration) => channelFromPostizIdentifier(integration.identifier)).length;
      setMessage(`Fetched ${integrations.length} Postiz channel(s); ${mappedCount} matched Greybrainer publishing targets.`);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch Postiz channels.');
    } finally {
      setIsFetchingPostiz(false);
    }
  };

  const usePostizCloudPreset = () => {
    setChannels((current) => current.map((channel) => ({
      ...channel,
      authType: 'none',
      endpointUrl: postizBaseUrl || POSTIZ_BASE_URL,
      mode: 'postiz',
      postizType: channel.postizType || channel.channel,
    })));
    setMessage('Postiz Cloud preset applied. Paste the API key and integration IDs for the channels you want to publish.');
  };

  const persistPack = async (nextStatus: 'editing' | 'approved') => {
    if (!draft || !pack) throw new Error('Select a draft first.');
    const sourcePayload = {
      ...getSourcePayload(draft),
      heroImageUrl: pack.heroImageUrl || null,
      posterImageUrl: pack.posterImageUrl || null,
      publishingLane: {
        facebook: pack.facebookCopy,
        instagram: pack.instagramCopy,
        medium: pack.mediumCopy,
        x: pack.xCopy,
      },
      tags,
      thumbnailImageUrl: pack.thumbnailImageUrl || null,
    };

    const versionDraft = await saveDraftVersion(draft.id, {
      blogMarkdown: pack.articleMarkdown,
      createdBy: currentUserEmail ?? 'editor:publish-lane',
      editorNotes: `Publishing lane save by ${currentUserEmail ?? 'unknown editor'}`,
      seoDescription: pack.seoDescription,
      seoTitle: pack.seoTitle,
      socials: {
        linkedin: pack.linkedinCopy,
        twitter: pack.xCopy,
      },
      sourcePayload,
      subjectTitle: pack.title,
    });

    const updatedDraft = await updateDraftRecord(versionDraft.id, {
      seoDescription: pack.seoDescription,
      seoTitle: pack.seoTitle,
      status: nextStatus,
      subjectTitle: pack.title,
    });

    setDraft(updatedDraft);
    setDrafts((current) => current.map((item) => item.id === updatedDraft.id ? updatedDraft : item));
    return updatedDraft;
  };

  const handleSave = async () => {
    setBusy('save');
    setMessage(null);
    setError(null);
    try {
      await persistPack('editing');
      setMessage('Publishing lane copy saved as a new draft version.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save publishing lane copy.');
    } finally {
      setBusy(null);
    }
  };

  const handleDryRun = async () => {
    if (!draft || !pack) return;
    setBusy('dry-run');
    setMessage(null);
    setError(null);
    try {
      const dryResult = await publishDraftThroughLane(draft.id, {
        channels: buildChannelPayload(pack),
        dryRun: true,
        pack: buildPayloadPack(pack),
        publishWebsite,
        requestedBy: currentUserEmail,
        versionId: draft.currentVersionId,
        websiteUrl: draft.websiteUrl,
      });
      setResult(dryResult);
      setMessage('Dry review completed. No external channels were called.');
    } catch (dryError) {
      setError(dryError instanceof Error ? dryError.message : 'Dry review failed.');
    } finally {
      setBusy(null);
    }
  };

  const handlePublish = async () => {
    if (!draft || !pack) return;
    setBusy('publish');
    setMessage(null);
    setError(null);
    try {
      const savedDraft = await persistPack('approved');
      const liveResult = await publishDraftThroughLane(savedDraft.id, {
        channels: buildChannelPayload(pack),
        dryRun: false,
        pack: buildPayloadPack(pack),
        publishWebsite,
        requestedBy: currentUserEmail,
        versionId: savedDraft.currentVersionId,
        websiteUrl: savedDraft.websiteUrl,
      });
      setResult(liveResult);
      const refreshed = await getDraft(savedDraft.id);
      setDraft(refreshed);
      setDrafts((current) => current.map((item) => item.id === refreshed.id ? refreshed : item));
      setMessage('Publish workflow finished. Review each channel result below.');
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Publish workflow failed.');
    } finally {
      setBusy(null);
    }
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage('Copied to clipboard.');
    } catch {
      setError('Clipboard copy failed.');
    }
  };

  const downloadText = (filename: string, content: string, type = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage(`Downloaded ${filename}.`);
  };

  const copyAuthorPackMarkdown = async () => {
    if (!draft || !pack) return;
    await copyText(buildAuthorPackMarkdown(draft, pack, channels));
  };

  const copyAuthorPackJson = async () => {
    if (!draft || !pack) return;
    await copyText(JSON.stringify(buildAuthorPackObject(draft, pack, channels), null, 2));
  };

  const downloadAuthorPack = () => {
    if (!draft || !pack) return;
    downloadText(`${pack.slug || slugify(pack.title) || 'greybrainer'}-author-pack.md`, buildAuthorPackMarkdown(draft, pack, channels), 'text/markdown');
  };

  if (loadingDrafts) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1500px] px-5 py-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">Greybrainer Studio</div>
            <h1 className="mt-1 text-2xl font-semibold text-white">Publishing Lane</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <a className="rounded-md border border-slate-700 px-3 py-2 text-slate-300 hover:border-sky-500 hover:text-sky-200" href={appPath('/studio/drafts')}>
              Draft queue
            </a>
            {draft && (
              <a className="rounded-md border border-slate-700 px-3 py-2 text-slate-300 hover:border-sky-500 hover:text-sky-200" href={appPath(`/studio/drafts/${draft.id}`)}>
                Full editor
              </a>
            )}
            <span className="rounded-md border border-slate-800 px-3 py-2 text-xs text-slate-400">
              {currentUserEmail ?? 'signed in'}
            </span>
          </div>
        </header>

        {error && <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}
        {message && <div className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</div>}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)_390px]">
          <aside className="space-y-4">
            <section className="rounded-lg border border-slate-800 bg-slate-900/70">
              <div className="border-b border-slate-800 px-4 py-3">
                <div className="text-sm font-medium text-slate-200">Drafts</div>
              </div>
              <div className="max-h-[calc(100vh-230px)] overflow-y-auto">
                {drafts.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-slate-500">No drafts found.</div>
                ) : drafts.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedDraftId(item.id)}
                    className={`w-full border-b border-slate-800 px-4 py-3 text-left hover:bg-slate-800/70 ${
                      selectedDraftId === item.id ? 'bg-slate-800' : ''
                    }`}
                  >
                    <div className="line-clamp-2 text-sm font-medium text-slate-100">{item.subjectTitle}</div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{item.status}</span>
                      <span>v{item.latestVersionNo}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <main className="space-y-4">
            {loadingDraft || !draft || !pack ? (
              <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70">
                {loadingDraft ? <LoadingSpinner /> : <span className="text-sm text-slate-500">Select a draft.</span>}
              </div>
            ) : (
              <>
                <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                    <label className="block">
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Title</div>
                      <input
                        value={pack.title}
                        onChange={(event) => updatePack({ title: event.target.value, slug: slugify(event.target.value) })}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Slug</div>
                      <input
                        value={pack.slug}
                        onChange={(event) => updatePack({ slug: slugify(event.target.value) })}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                      />
                    </label>
                    <label className="block lg:col-span-2">
                      <div className="mb-1 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-500">
                        <span>SEO Title</span>
                        <span className={pack.seoTitle.length <= 65 ? 'text-emerald-300' : 'text-amber-300'}>{pack.seoTitle.length}/65</span>
                      </div>
                      <input
                        value={pack.seoTitle}
                        onChange={(event) => updatePack({ seoTitle: event.target.value })}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                      />
                    </label>
                    <label className="block lg:col-span-2">
                      <div className="mb-1 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-500">
                        <span>Meta Description</span>
                        <span className={pack.seoDescription.length >= 90 && pack.seoDescription.length <= 160 ? 'text-emerald-300' : 'text-amber-300'}>{pack.seoDescription.length}/160</span>
                      </div>
                      <textarea
                        value={pack.seoDescription}
                        onChange={(event) => updatePack({ seoDescription: event.target.value, excerpt: event.target.value })}
                        rows={3}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm leading-6 text-slate-100 outline-none focus:border-sky-500"
                      />
                    </label>
                    <label className="block lg:col-span-2">
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">SEO Tags</div>
                      <input
                        value={pack.tagsText}
                        onChange={(event) => updatePack({ tagsText: event.target.value })}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-800 bg-slate-900/70">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-200">Edited Article Copy</div>
                      <div className="text-xs text-slate-500">Saved as a new version before live publishing</div>
                    </div>
                    <button
                      onClick={() => void copyText(pack.articleMarkdown)}
                      className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-sky-500 hover:text-sky-200"
                    >
                      Copy
                    </button>
                  </div>
                  <textarea
                    value={pack.articleMarkdown}
                    onChange={(event) => updatePack({ articleMarkdown: event.target.value })}
                    rows={18}
                    className="min-h-[440px] w-full resize-y border-0 bg-slate-950/80 p-4 font-mono text-xs leading-6 text-slate-200 outline-none"
                  />
                </section>

                <section className="rounded-lg border border-emerald-500/30 bg-emerald-950/10">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-emerald-100">Author Mode Handoff</div>
                      <div className="text-xs text-emerald-200/70">One finished pack for writers, schedulers, or a tech person to publish without editing.</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => void copyAuthorPackMarkdown()}
                        className="rounded-md border border-emerald-500/40 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-500/10"
                      >
                        Copy Pack
                      </button>
                      <button
                        onClick={() => void copyAuthorPackJson()}
                        className="rounded-md border border-emerald-500/40 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-500/10"
                      >
                        Copy JSON
                      </button>
                      <button
                        onClick={downloadAuthorPack}
                        className="rounded-md bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 p-4 text-xs md:grid-cols-3">
                    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                      <div className="mb-1 font-medium text-slate-200">SEO Ready</div>
                      <div className="text-slate-400">{pack.seoTitle.length}/65 title, {pack.seoDescription.length}/160 description</div>
                    </div>
                    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                      <div className="mb-1 font-medium text-slate-200">Social Ready</div>
                      <div className="text-slate-400">Medium, LinkedIn, X thread, Facebook, Instagram</div>
                    </div>
                    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                      <div className="mb-1 font-medium text-slate-200">Operator Ready</div>
                      <div className="text-slate-400">No rewriting needed; copy directly into Buffer, Publer, Metricool, Postiz, or native apps.</div>
                    </div>
                  </div>
                  <pre className="max-h-64 overflow-auto border-t border-emerald-500/20 bg-slate-950/70 p-4 text-[11px] leading-5 text-slate-300">
                    {buildAuthorPackMarkdown(draft, pack, channels)}
                  </pre>
                </section>

                <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {(['medium', 'linkedin', 'x', 'facebook', 'instagram'] as ChannelKey[]).map((channel) => {
                    const key = `${channel}Copy` as keyof PublishPack;
                    const value = String(pack[key] ?? '');
                    return (
                      <div key={channel} className="rounded-lg border border-slate-800 bg-slate-900/70">
                        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                          <div className="text-sm font-medium text-slate-200">{CHANNEL_LABELS[channel]} Copy</div>
                          <button
                            onClick={() => void copyText(value)}
                            className="rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-sky-500 hover:text-sky-200"
                          >
                            Copy
                          </button>
                        </div>
                        <textarea
                          value={value}
                          onChange={(event) => updatePack({ [key]: event.target.value } as Partial<PublishPack>)}
                          rows={channel === 'medium' ? 12 : 8}
                          className="w-full resize-y border-0 bg-slate-950/70 p-4 text-xs leading-5 text-slate-200 outline-none"
                        />
                      </div>
                    );
                  })}
                </section>
              </>
            )}
          </main>

          <aside className="space-y-4">
            <section className="rounded-lg border border-sky-500/30 bg-sky-950/20 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-sky-100">Postiz Setup</div>
                  <div className="text-xs text-sky-200/70">Fetch connected channels and auto-map Greybrainer handles.</div>
                </div>
                <span className="rounded bg-sky-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
                  Preferred
                </span>
              </div>
              <div className="space-y-2">
                <input
                  value={postizApiKey}
                  onChange={(event) => setPostizApiKey(event.target.value)}
                  placeholder="Postiz Public API key"
                  type="password"
                  className="w-full rounded-md border border-sky-500/30 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-400"
                />
                <input
                  value={postizBaseUrl}
                  onChange={(event) => setPostizBaseUrl(event.target.value)}
                  placeholder={POSTIZ_BASE_URL}
                  className="w-full rounded-md border border-sky-500/30 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-400"
                />
                <input
                  value={postizGroup}
                  onChange={(event) => setPostizGroup(event.target.value)}
                  placeholder="Optional Postiz group/customer ID"
                  className="w-full rounded-md border border-sky-500/30 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-400"
                />
                <button
                  onClick={() => void handleFetchPostizIntegrations()}
                  disabled={isFetchingPostiz}
                  className="w-full rounded-md bg-sky-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-60"
                >
                  {isFetchingPostiz ? 'Fetching channels...' : 'Fetch & Map Postiz Channels'}
                </button>
              </div>
              <div className="mt-3 rounded-md border border-sky-500/20 bg-slate-950/60 px-3 py-2 text-[11px] leading-5 text-sky-100/80">
                Matching hints: Medium @GreyBrainer, LinkedIn company greybrainer, X @Greybrainlens, Instagram @greybrainlens.
              </div>
              {postizIntegrations.length > 0 && (
                <div className="mt-3 space-y-1 text-[11px] text-slate-300">
                  {postizIntegrations.slice(0, 6).map((integration) => (
                    <div key={integration.id} className="truncate rounded border border-slate-800 bg-slate-950/70 px-2 py-1">
                      {integrationLabel(integration)}
                    </div>
                  ))}
                  {postizIntegrations.length > 6 && (
                    <div className="text-slate-500">+{postizIntegrations.length - 6} more connected channel(s)</div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-200">Publish Controls</div>
                  <div className="text-xs text-slate-500">{selectedChannelCount} channel(s) selected</div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={publishWebsite}
                    onChange={(event) => setPublishWebsite(event.target.checked)}
                  />
                  Website first
                </label>
              </div>

              <div className="mb-4 space-y-2">
                {checklist.map((item) => (
                  <div key={item.label} className={`flex items-center gap-2 text-xs ${item.ok ? 'text-emerald-300' : 'text-amber-300'}`}>
                    <span>{item.ok ? 'OK' : 'Needs work'}</span>
                    <span className="text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => void handleSave()}
                  disabled={Boolean(busy || !draft || !pack)}
                  className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:border-sky-500 disabled:opacity-50"
                >
                  {busy === 'save' ? 'Saving...' : 'Save Lane Copy'}
                </button>
                <button
                  onClick={() => void handleDryRun()}
                  disabled={Boolean(busy || !draft || !pack)}
                  className="rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
                >
                  {busy === 'dry-run' ? 'Reviewing...' : 'Dry Review'}
                </button>
                <button
                  onClick={() => void handlePublish()}
                  disabled={Boolean(busy || !draft || !pack || checklist.some((item) => !item.ok))}
                  className="rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                >
                  {busy === 'publish' ? 'Publishing...' : 'Publish Approved Pack'}
                </button>
              </div>
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900/70">
              <div className="border-b border-slate-800 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-200">Channel Connectors</div>
                    <div className="text-xs text-slate-500">Postiz is recommended; URL/API and native connectors stay available.</div>
                  </div>
                  <button
                    onClick={usePostizCloudPreset}
                    className="rounded-md border border-sky-500/50 px-2.5 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/10"
                  >
                    Use Postiz
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-800">
                {channels.map((channel) => {
                  const nativeAccounts = accounts.filter((account) => account.platform === channel.channel);
                  const postizAccounts = matchingIntegrations(postizIntegrations, channel.channel);
                  return (
                    <div key={channel.channel} className="space-y-3 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                          <input
                            type="checkbox"
                            checked={channel.enabled}
                            onChange={(event) => updateChannel(channel.channel, { enabled: event.target.checked })}
                          />
                          {CHANNEL_LABELS[channel.channel]}
                        </label>
                        <select
                          value={channel.mode}
                          onChange={(event) => updateChannel(channel.channel, { mode: event.target.value as PublishLaneChannelMode })}
                          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
                        >
                          <option value="postiz">Postiz</option>
                          <option value="webhook">URL/API</option>
                          <option value="native">Native</option>
                        </select>
                      </div>

                      {channel.mode === 'native' ? (
                        <select
                          value={channel.socialAccountId}
                          onChange={(event) => updateChannel(channel.channel, { socialAccountId: event.target.value })}
                          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                        >
                          <option value="">Select connected account</option>
                          {nativeAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.displayName ?? account.handle ?? account.profileUrl} ({account.connectionStatus})
                            </option>
                          ))}
                        </select>
                      ) : channel.mode === 'postiz' ? (
                        <div className="space-y-2">
                          {postizAccounts.length > 0 && (
                            <select
                              value={channel.postizIntegrationId}
                              onChange={(event) => {
                                const selected = postizAccounts.find((integration) => integration.id === event.target.value);
                                updateChannel(channel.channel, {
                                  postizIntegrationId: event.target.value,
                                  postizType: selected?.identifier ?? channel.postizType,
                                });
                              }}
                              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                            >
                              <option value="">Select Postiz channel</option>
                              {postizAccounts.map((integration) => (
                                <option key={integration.id} value={integration.id}>
                                  {integrationLabel(integration)}
                                </option>
                              ))}
                            </select>
                          )}
                          <input
                            value={channel.endpointUrl}
                            onChange={(event) => updateChannel(channel.channel, { endpointUrl: event.target.value })}
                            placeholder={POSTIZ_BASE_URL}
                            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500"
                          />
                          <input
                            value={channel.apiKey}
                            onChange={(event) => updateChannel(channel.channel, { apiKey: event.target.value })}
                            placeholder="Optional Postiz key override"
                            type="password"
                            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500"
                          />
                          <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
                            <input
                              value={channel.postizIntegrationId}
                              onChange={(event) => updateChannel(channel.channel, { postizIntegrationId: event.target.value })}
                              placeholder="Postiz integration ID"
                              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500"
                            />
                            <input
                              value={channel.postizType}
                              onChange={(event) => updateChannel(channel.channel, { postizType: event.target.value })}
                              placeholder="type"
                              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500"
                            />
                          </div>
                          <label className="flex items-center gap-2 text-xs text-slate-400">
                            <input
                              type="checkbox"
                              checked={channel.postizUploadMedia}
                              onChange={(event) => updateChannel(channel.channel, { postizUploadMedia: event.target.checked })}
                            />
                            Upload hero/thumb URL to Postiz before posting
                          </label>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            value={channel.endpointUrl}
                            onChange={(event) => updateChannel(channel.channel, { endpointUrl: event.target.value })}
                            placeholder="https://automation.example/webhook"
                            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500"
                          />
                          <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
                            <select
                              value={channel.authType}
                              onChange={(event) => updateChannel(channel.channel, { authType: event.target.value as PublishLaneAuthType })}
                              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200"
                            >
                              <option value="bearer">Bearer</option>
                              <option value="x-api-key">x-api-key</option>
                              <option value="custom-header">Custom</option>
                              <option value="none">None</option>
                            </select>
                            <input
                              value={channel.apiKey}
                              onChange={(event) => updateChannel(channel.channel, { apiKey: event.target.value })}
                              placeholder="Paste key for this run"
                              type="password"
                              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500"
                            />
                          </div>
                          {channel.authType === 'custom-header' && (
                            <input
                              value={channel.authHeaderName}
                              onChange={(event) => updateChannel(channel.channel, { authHeaderName: event.target.value })}
                              placeholder="Header name, e.g. x-api-key"
                              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900/70">
              <div className="border-b border-slate-800 px-4 py-3">
                <div className="text-sm font-medium text-slate-200">Execution Log</div>
              </div>
              <div className="space-y-3 p-4">
                {!result ? (
                  <div className="text-sm text-slate-500">No run yet.</div>
                ) : (
                  <>
                    <div className={`rounded-md border px-3 py-2 text-xs ${resultTone(getWebsiteStatus(result))}`}>
                      Website: {getWebsiteStatus(result)}
                      {result.canonicalUrl && (
                        <a href={result.canonicalUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate underline">
                          {result.canonicalUrl}
                        </a>
                      )}
                    </div>
                    {result.results.map((item, index) => (
                      <div key={`${item.channel}-${index}`} className={`rounded-md border px-3 py-2 text-xs ${resultTone(item.status)}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{item.channel}</span>
                          <span>{item.status}</span>
                        </div>
                        <div className="mt-1 text-slate-300/80">{item.mode}{item.endpointHost ? ` - ${item.endpointHost}` : ''}</div>
                        {item.externalUrl && (
                          <a href={item.externalUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate underline">
                            {item.externalUrl}
                          </a>
                        )}
                        {item.error && <div className="mt-1 text-red-100">{item.error}</div>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};
