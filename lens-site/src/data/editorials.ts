export interface ScoreRing {
  label: string;
  shortLabel: string;
  score: number;
  description: string;
  accent: string;
}

export interface MorphMoment {
  timeLabel: string;
  intensity: number;
  emotion: string;
  valence: 'positive' | 'negative' | 'neutral';
  tag?: string;
  event: string;
}

export interface LensEntry {
  slug: string;
  title: string;
  dek: string;
  category: string;
  contentType: 'review' | 'study' | 'brief';
  runTime: string;
  releaseFocus: string;
  criticAngle: string;
  mood: string;
  publishedAt: string;
  heroGradient: string;
  heroImageUrl?: string;
  pullQuote: string;
  tags: string[];
  thumbnailEyebrow?: string;
  thumbnailImageUrl?: string;
  posterLabel?: string;
  posterImageUrl?: string;
  platform?: string;
  year?: string;
  overallScore?: number;
  verdict?: string;
  summary?: string;
  blogMarkdown?: string;
  scoreRings?: ScoreRing[];
  morphokinetics?: {
    summary: string;
    timelineNotes: string;
    keyMoments: MorphMoment[];
  };
  sections: Array<{
    heading: string;
    body: string[];
  }>;
  heroPriority?: number;
  keywords?: string[];
  summaryHook?: string;
  readingMetadata?: {
    estimatedReadTime: string;
    sectionAnchors: Array<{ id: string; label: string; wordCount: number }>;
    relatedSlugs: string[];
  };
}

export const lensEntries: LensEntry[] = [
  {
    slug: 'the-bluff-2026',
    title: 'The Bluff (2026)',
    dek: 'A muscular pirate survival thriller with a compelling maternal engine, but not enough narrative depth to fully cash in on its premise.',
    category: 'Quantified Review',
    contentType: 'review',
    runTime: '11 min read',
    releaseFocus: 'Prime Video Release',
    criticAngle: 'Practical brutality versus thin emotional architecture',
    mood: 'Salted, bruising, sharp-edged',
    publishedAt: 'March 12, 2026',
    heroGradient: 'linear-gradient(135deg, rgba(29,54,77,0.98), rgba(11,15,24,0.98) 46%, rgba(119,52,33,0.95))',
    pullQuote: 'The Bluff works when survival pressure takes over. It weakens when the past it keeps invoking never fully acquires weight.',
    tags: ['Prime Video', 'Action Thriller', 'Pirate Cinema', 'Greybrainer Review'],
    thumbnailEyebrow: 'Survival Spiral',
    thumbnailImageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop', // Placeholder pirate image
    posterLabel: 'The Bluff',
    platform: 'Amazon Prime Video',
    year: '2026',
    overallScore: 6.3,
    verdict: 'A fierce, competent action vehicle that stops short of becoming a richer pirate drama.',
    scoreRings: [
      {
        label: 'Magic of Story/Script',
        shortLabel: 'Story',
        score: 6.5,
        description: 'Strong stakes and a potent maternal survival hook, but thin backstory and familiar action plotting.',
        accent: 'story',
      },
      {
        label: 'Magic of Conceptualization',
        shortLabel: 'Concept',
        score: 6.0,
        description: 'The female-led pirate frame is fresh, though the film does not push its world-building or subversion far enough.',
        accent: 'concept',
      },
      {
        label: 'Magic of Performance/Execution',
        shortLabel: 'Performance',
        score: 6.5,
        description: 'Priyanka Chopra Jonas and Karl Urban give the film its bite, even when the formal execution turns uneven.',
        accent: 'performance',
      },
    ],
    morphokinetics: {
      summary:
        'The film moves like a survival spiral: a measured setup, escalating pursuit, a sharp mid-film drop, and then a hard climb into siege and release.',
      timelineNotes:
        'Its motion pattern is driven less by mystery than by tactical pressure. The best sections accelerate through physical jeopardy, while the weakest sections arrive when history is referenced rather than dramatized.',
      keyMoments: [
        {
          timeLabel: '~5%',
          intensity: 4,
          emotion: 'Foreboding',
          valence: 'negative',
          tag: 'Pacing Shift',
          event: 'Domestic calm is interrupted by the first sign that Ercell\'s pirate past is not done with her.',
        },
        {
          timeLabel: '~22%',
          intensity: 6,
          emotion: 'Suspicion',
          valence: 'negative',
          event: 'The threat solidifies and the film turns from atmospheric setup into active hunt mechanics.',
        },
        {
          timeLabel: '~44%',
          intensity: 8,
          emotion: 'Adrenaline',
          valence: 'neutral',
          tag: 'Twist',
          event: 'The survival engine peaks as Ercell is forced fully back into tactical violence.',
        },
        {
          timeLabel: '~56%',
          intensity: 3,
          emotion: 'Exposure',
          valence: 'negative',
          event: 'Momentum dips as the film gestures at old emotional wounds without deepening them enough.',
        },
        {
          timeLabel: '~82%',
          intensity: 9,
          emotion: 'Ferocity',
          valence: 'neutral',
          tag: 'Pacing Shift',
          event: 'The siege mode locks in and the film becomes a stripped-down contest of force, terrain, and maternal will.',
        },
        {
          timeLabel: '~94%',
          intensity: 5,
          emotion: 'Aftershock',
          valence: 'neutral',
          event: 'The release arrives with functional closure rather than deep emotional reckoning.',
        },
      ],
    },
    sections: [
      {
        heading: 'What the rings reveal',
        body: [
          'Greybrainer\'s three-ring read of The Bluff is unusually coherent: Story and Performance are both stronger than the film\'s conceptual completion. That tells us the movie does not fail because it lacks force. It falls short because its emotional and thematic architecture is lighter than its premise promises.',
          'The former-pirate-mother hook is commercially legible and dramatically alive. But every time the film nears a deeper reckoning with memory, violence, or redemption, it tends to choose propulsion over excavation.'
        ]
      },
      {
        heading: 'Where the film works',
        body: [
          'The Bluff is most convincing when it behaves like a survival machine. The clear stakes, the island terrain, and the brutality of the action all help Priyanka Chopra Jonas hold the center with conviction. Karl Urban gives the film a proper counterweight, and that tension keeps the film watchable even when the script thins out.',
          'In Greybrainer terms, the outer ring is doing rescue work. Execution keeps the movie alive when narrative depth begins to sag.'
        ]
      },
      {
        heading: 'Why it remains a partial achievement',
        body: [
          'The film repeatedly hints that its past is emotionally loaded, politically textured, and morally complicated. Yet that history mostly remains informational instead of lived. The result is a movie that wants the symbolic density of a harder pirate tragedy, but lands as a cleaner, narrower action product.',
          'That does not make it a miss. It makes it a study in unrealized leverage: enough strength to entertain, not enough depth to linger.'
        ]
      }
    ],
  },
  {
    slug: 'accused-2026',
    title: 'Accused (2026)',
    dek: 'A bold, gender-flipped psychological thriller that thinks sharply about reputation and power, but cannot fully stabilize its own execution.',
    category: 'Quantified Review',
    contentType: 'review',
    runTime: '12 min read',
    releaseFocus: 'Netflix Release',
    criticAngle: 'A strong premise trapped inside an uneven formal container',
    mood: 'Cold, intellectual, uneasy',
    publishedAt: 'March 11, 2026',
    heroGradient: 'linear-gradient(135deg, rgba(48,32,72,0.96), rgba(11,12,19,0.98) 50%, rgba(20,69,93,0.92))',
    pullQuote: 'Accused is most alive as an idea: what happens when public judgment outruns truth and the institution becomes the real pressure chamber.',
    tags: ['Netflix', 'Psychological Thriller', '#MeToo', 'Greybrainer Review'],
    thumbnailEyebrow: 'Institutional Dread',
    thumbnailImageUrl: 'https://images.unsplash.com/photo-1489599735734-79b4d8c3b0b5?w=400&h=600&fit=crop', // Placeholder thriller image
    posterLabel: 'Accused',
    platform: 'Netflix',
    year: '2026',
    overallScore: 5.7,
    verdict: 'A serious psychological study with a powerful central performance, but a weaker outer ring than its premise deserves.',
    scoreRings: [
      {
        label: 'Magic of Story/Script',
        shortLabel: 'Story',
        score: 6.5,
        description: 'The premise is bold and contemporary, with strong ambiguity and psychological framing.',
        accent: 'story',
      },
      {
        label: 'Magic of Conceptualization',
        shortLabel: 'Concept',
        score: 6.5,
        description: 'The gender-flipped, queer-centered framing is the film\'s strongest and most distinctive act of design.',
        accent: 'concept',
      },
      {
        label: 'Magic of Performance/Execution',
        shortLabel: 'Performance',
        score: 4.0,
        description: 'Konkona Sen Sharma anchors the film, but the broader execution never fully matches the intelligence of the setup.',
        accent: 'performance',
      },
    ],
    morphokinetics: {
      summary:
        'Accused behaves like a pressure chamber, not a chase. Its motion comes from social corrosion, doubt, and relational fracture rather than physical escalation.',
      timelineNotes:
        'The movie prefers controlled dread and interior collapse. Its main kinetic problem is that the formal tension line does not always rise with the same conviction as the premise itself.',
      keyMoments: [
        {
          timeLabel: '~8%',
          intensity: 3,
          emotion: 'Stability',
          valence: 'neutral',
          event: 'The film establishes Geetika as accomplished, respected, and socially legible before disruption enters the frame.',
        },
        {
          timeLabel: '~26%',
          intensity: 6,
          emotion: 'Disorientation',
          valence: 'negative',
          tag: 'Pacing Shift',
          event: 'Anonymous allegations begin to circulate and the film moves from professional confidence into reputational threat.',
        },
        {
          timeLabel: '~48%',
          intensity: 8,
          emotion: 'Isolation',
          valence: 'negative',
          event: 'Institutional scrutiny and interpersonal doubt start collapsing Geetika\'s emotional perimeter.',
        },
        {
          timeLabel: '~63%',
          intensity: 5,
          emotion: 'Ambiguity',
          valence: 'neutral',
          tag: 'Twist',
          event: 'The film doubles down on uncertainty instead of relief, forcing the audience to sit inside unresolved perception.',
        },
        {
          timeLabel: '~84%',
          intensity: 9,
          emotion: 'Exposure',
          valence: 'negative',
          event: 'The moral and relational stakes peak, but the surrounding execution does not always deliver equal force.',
        },
        {
          timeLabel: '~96%',
          intensity: 4,
          emotion: 'Residual Unease',
          valence: 'negative',
          event: 'The ending releases tension quickly, leaving behind a provocative concept and an incomplete dramatic afterimage.',
        },
      ],
    },
    sections: [
      {
        heading: 'A concept stronger than its finish',
        body: [
          'Accused is an unusually promising Greybrainer case because its inner and middle rings are both healthy. The core idea is timely, ethically charged, and dramatically fertile. The conceptual framing is equally smart: a queer woman accused inside a #MeToo-adjacent system, told as psychological erosion rather than courtroom spectacle.',
          'That should have produced a formidable public-intellectual thriller. Instead, the film lands as an intelligent but unstable object whose outer ring cannot consistently support the weight of the premise.'
        ]
      },
      {
        heading: 'Why the film matters anyway',
        body: [
          'The movie understands that reputational collapse is itself cinematic material. It also understands that the most frightening antagonist in contemporary institutional life may not be an individual villain, but an accusation system, a procedural vacuum, or a social narrative nobody can slow down.',
          'That makes Accused culturally interesting even when it is formally uneven. It belongs to the same wider cycle Greybrainer has been tracking: cinema of administrative dread and moral bureaucracy.'
        ]
      },
      {
        heading: 'The critical split',
        body: [
          'Konkona Sen Sharma gives the film its gravity. But a single strong center cannot solve every surrounding softness in pacing, supporting characterization, and dramatic payoff. That is why the film feels simultaneously serious and under-realized.',
          'Greybrainer\'s quantified method is useful here because it prevents lazy verdicts. Accused is not simply a bad film or a good one. It is a structurally revealing split decision between thought and finish.'
        ]
      }
    ],
  },
  {
    slug: 'the-age-of-administrative-horror',
    title: 'The Age of Administrative Horror',
    dek: 'Why Indian film and OTT storytelling now treats bureaucracy, paperwork, and invisible systems as the villain audiences fear most.',
    category: 'Lens Essay',
    contentType: 'study',
    runTime: '8 min read',
    releaseFocus: 'Cinema Culture',
    criticAngle: 'Institutional dread replacing monster logic',
    mood: 'Forensic, elegant, unsettling',
    publishedAt: 'March 12, 2026',
    heroGradient: 'linear-gradient(135deg, rgba(123,38,23,0.96), rgba(14,16,24,0.98) 58%, rgba(35,45,68,0.98))',
    pullQuote: 'The new monster in 2026 cinema is not supernatural. It is procedural.',
    tags: ['Daily Intelligence', 'Theme Study', 'Institutional Dissent'],
    thumbnailEyebrow: 'Morning Brief',
    thumbnailImageUrl: 'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=400&h=600&fit=crop', // Placeholder office/horror image
    sections: [
      {
        heading: 'The New Villain Is a Process',
        body: [
          'Across the current Indian screen cycle, dread no longer arrives only through violence or spectacle. It arrives through portals, archives, signatures, compliance, and technical delay. Greybrainer’s editorial thesis is that audiences are reacting not simply to plot, but to a lived recognition that systems now shape the emotional life of survival.',
          'This is why legal dramas, surveillance thrillers, reputational meltdowns, and heritage disputes are resonating with such force. They mirror a public that increasingly experiences power as distributed, opaque, and procedural.'
        ]
      },
      {
        heading: 'Why It Feels Urgent',
        body: [
          'What once belonged to niche political cinema has moved into mainstream tension design. Server errors, incomplete records, and institutional ambiguity now act like suspense engines. The audience does not just watch the character being trapped. They understand the texture of the trap.',
          'That shift matters editorially because it opens a richer review language than hit-flop chatter. Lens should be the place that names these patterns early, with the confidence of a newsroom and the precision of a cultural lab.'
        ]
      },
      {
        heading: 'What Lens Should Do With It',
        body: [
          'The public site should foreground interpretation, not generic listicles. Each editorial needs a clear thesis, a social reading, and a cinematic proof set. A great Lens piece should feel halfway between a sharply cut magazine feature and a premium critic dossier.',
          'That is the editorial identity this Astro surface is designed to hold: cinematic but serious, elegant but legible, and always more analytical than promotional.'
        ]
      }
    ],
  },
  {
    slug: 'super-fans-and-the-screen-allocation-war',
    title: 'Super-Fans and the Screen Allocation War',
    dek: 'Box office clashes are no longer just release dates. They are infrastructure battles fought across fandom, multiplex logic, and algorithmic attention.',
    category: 'Industry Study',
    contentType: 'study',
    runTime: '6 min read',
    releaseFocus: 'Box Office Politics',
    criticAngle: 'Fan energy meets exhibition economics',
    mood: 'Hot, strategic, reportorial',
    publishedAt: 'March 10, 2026',
    heroGradient: 'linear-gradient(135deg, rgba(17,52,74,0.96), rgba(10,12,20,0.98) 56%, rgba(108,30,18,0.92))',
    pullQuote: 'In modern Indian film culture, screens are not neutral real estate. They are symbolic territory.',
    tags: ['Screen Wars', 'Distribution', 'Fandom'],
    thumbnailEyebrow: 'Trade Signal',
    thumbnailImageUrl: 'https://images.unsplash.com/photo-1489599735734-79b4d8c3b0b5?w=400&h=600&fit=crop', // Placeholder cinema/crowd image
    sections: [
      {
        heading: 'The Clash Behind the Clash',
        body: [
          'When two star-driven releases converge, the loudest argument is often framed as fandom. But the deeper struggle concerns visibility, show-time volume, premium format access, and how distributors convert online fervor into physical dominance.',
          'Lens should treat these events as infrastructure stories. The important question is not only who wins opening day. It is what the clash reveals about the current architecture of power.'
        ]
      },
      {
        heading: 'Why Audiences Care',
        body: [
          'Fans increasingly understand distribution mechanics. They discuss IMAX allocation, regional prioritization, and platform bias with the fluency of trade watchers. That means editorial writing can go deeper without losing accessibility.',
          'A premium public Lens site should reward that sophistication rather than flatten it into gossip.'
        ]
      }
    ],
  },
  {
    slug: 'digital-loneliness-and-the-ott-romance-boom',
    title: 'Digital Loneliness and the OTT Romance Boom',
    dek: 'The most shared romantic stories are increasingly less about ideal love and more about interface anxiety, mediated intimacy, and emotional outsourcing.',
    category: 'Audience Intelligence',
    contentType: 'brief',
    runTime: '7 min read',
    releaseFocus: 'OTT Behaviour',
    criticAngle: 'Romance as platform-era symptom',
    mood: 'Tender, analytical, contemporary',
    publishedAt: 'March 9, 2026',
    heroGradient: 'linear-gradient(135deg, rgba(84,18,46,0.96), rgba(14,16,24,0.98) 52%, rgba(32,67,88,0.96))',
    pullQuote: 'The streaming romance now asks whether connection is real when every feeling is platform-mediated.',
    tags: ['Daily Intelligence', 'OTT Behaviour', 'Audience Signals'],
    thumbnailEyebrow: 'Audience Mood',
    thumbnailImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop', // Placeholder romance/streaming image
    sections: [
      {
        heading: 'A New Emotional Setting',
        body: [
          'Greybrainer’s audience lens keeps returning to the same motif: digital intimacy is no longer a side theme. It is the setting itself. Romantic OTT hits are increasingly structured around absence, latency, interface logic, and the exhaustion of permanent availability.',
          'That does not make them less emotional. It makes them more diagnostic.'
        ]
      },
      {
        heading: 'Why Lens Can Own This Conversation',
        body: [
          'A conventional review asks whether the chemistry works. Lens can ask what kind of social condition the chemistry is trying to repair. That distinction is what separates a review destination from a deeper cultural publication.',
          'The public site should keep making that promise visually and editorially: cinema coverage with interpretive authority.'
        ]
      }
    ]
  }
];

export const featuredEditorials = lensEntries;
export const reviewEntries = lensEntries.filter((entry) => entry.contentType === 'review');
export const briefEntries = lensEntries.filter((entry) => entry.contentType === 'brief');
export const researchEntries = lensEntries.filter((entry) => entry.contentType === 'study');
export const studyEntries = lensEntries.filter((entry) => entry.contentType !== 'review');
export const sampleEntries = lensEntries;

export function getEntryHref(entry: LensEntry) {
  if (entry.contentType === 'brief') {
    return `/briefs/${entry.slug}`;
  }

  if (entry.contentType === 'study') {
    return `/research/${entry.slug}`;
  }

  return `/reviews/${entry.slug}`;
}

export function getEntrySectionHref(contentType: LensEntry['contentType']) {
  if (contentType === 'brief') {
    return '/briefs';
  }

  if (contentType === 'study') {
    return '/research';
  }

  return '/reviews';
}

export const editorialShelf = [
  {
    label: 'Three-Ring Reviews',
    note: 'Story, Concept, and Performance scored with visible reasoning instead of flat star ratings.',
  },
  {
    label: 'Morphokinetic Maps',
    note: 'Narrative flow, pacing shifts, emotional valence, and key turning points made legible.',
  },
  {
    label: 'Daily Intelligence',
    note: 'Adaptive briefs that turn the Indian screen cycle into a serious editorial morning file.',
  },
  {
    label: 'Deep Movie Studies',
    note: 'Long-form criticism that treats films as cultural evidence, not disposable content.',
  }
];
