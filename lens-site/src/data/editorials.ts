export interface LensEditorial {
  slug: string;
  title: string;
  dek: string;
  category: string;
  runTime: string;
  releaseFocus: string;
  criticAngle: string;
  mood: string;
  publishedAt: string;
  heroGradient: string;
  pullQuote: string;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
}

export const featuredEditorials: LensEditorial[] = [
  {
    slug: 'the-age-of-administrative-horror',
    title: 'The Age of Administrative Horror',
    dek: 'Why Indian film and OTT storytelling now treats bureaucracy, paperwork, and invisible systems as the villain audiences fear most.',
    category: 'Lens Essay',
    runTime: '8 min read',
    releaseFocus: 'Cinema Culture',
    criticAngle: 'Institutional dread replacing monster logic',
    mood: 'Forensic, elegant, unsettling',
    publishedAt: 'March 12, 2026',
    heroGradient: 'linear-gradient(135deg, rgba(123,38,23,0.96), rgba(14,16,24,0.98) 58%, rgba(35,45,68,0.98))',
    pullQuote: 'The new monster in 2026 cinema is not supernatural. It is procedural.',
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
    ]
  },
  {
    slug: 'super-fans-and-the-screen-allocation-war',
    title: 'Super-Fans and the Screen Allocation War',
    dek: 'Box office clashes are no longer just release dates. They are infrastructure battles fought across fandom, multiplex logic, and algorithmic attention.',
    category: 'Industry Study',
    runTime: '6 min read',
    releaseFocus: 'Box Office Politics',
    criticAngle: 'Fan energy meets exhibition economics',
    mood: 'Hot, strategic, reportorial',
    publishedAt: 'March 10, 2026',
    heroGradient: 'linear-gradient(135deg, rgba(17,52,74,0.96), rgba(10,12,20,0.98) 56%, rgba(108,30,18,0.92))',
    pullQuote: 'In modern Indian film culture, screens are not neutral real estate. They are symbolic territory.',
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
    ]
  },
  {
    slug: 'digital-loneliness-and-the-ott-romance-boom',
    title: 'Digital Loneliness and the OTT Romance Boom',
    dek: 'The most shared romantic stories are increasingly less about ideal love and more about interface anxiety, mediated intimacy, and emotional outsourcing.',
    category: 'Audience Intelligence',
    runTime: '7 min read',
    releaseFocus: 'OTT Behaviour',
    criticAngle: 'Romance as platform-era symptom',
    mood: 'Tender, analytical, contemporary',
    publishedAt: 'March 9, 2026',
    heroGradient: 'linear-gradient(135deg, rgba(84,18,46,0.96), rgba(14,16,24,0.98) 52%, rgba(32,67,88,0.96))',
    pullQuote: 'The streaming romance now asks whether connection is real when every feeling is platform-mediated.',
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

export const editorialShelf = [
  {
    label: 'Morning Intelligence',
    note: 'Daily adaptive brief distilled for editors and serious readers.',
  },
  {
    label: 'Deep Movie Studies',
    note: 'Long-form cultural and industrial analysis rooted in film evidence.',
  },
  {
    label: 'Screen Wars',
    note: 'Release politics, platform strategy, and exhibition power maps.',
  },
  {
    label: 'Audience Signals',
    note: 'How OTT behaviour, fandom, and anxiety shape what travels.',
  }
];
