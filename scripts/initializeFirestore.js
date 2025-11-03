// Initialize Firestore with admin users and sample data
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDdWuwH2BAz9nSWVLXyC2uE8qoxl5QU3lY",
  authDomain: "greybrainer.firebaseapp.com",
  projectId: "greybrainer",
  storageBucket: "greybrainer.firebasestorage.app",
  messagingSenderId: "334602682761",
  appId: "1:334602682761:web:a8cc82bd81a753a3392158",
  measurementId: "G-BQ36BCQTTX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initializeDatabase() {
  console.log('🔥 Initializing Firestore database...');
  
  try {
    // Add admin users to whitelist
    const adminUsers = [
      {
        email: 'satish@skids.health',
        role: 'admin',
        isActive: true,
        addedBy: 'system',
        addedAt: new Date(),
        department: 'Administration'
      },
      {
        email: 'satish.rath@gmail.com',
        role: 'admin',
        isActive: true,
        addedBy: 'system',
        addedAt: new Date(),
        department: 'Administration'
      },
      {
        email: 'dr.satish@greybrain.ai',
        role: 'admin',
        isActive: true,
        addedBy: 'system',
        addedAt: new Date(),
        department: 'AI Research'
      },
      {
        email: 'drpratichi@skids.health',
        role: 'editor',
        isActive: true,
        addedBy: 'system',
        addedAt: new Date(),
        department: 'Editorial'
      },
      {
        email: 'test1@greybrainer.com',
        role: 'analyst',
        isActive: true,
        addedBy: 'system',
        addedAt: new Date(),
        department: 'Film Analysis'
      }
    ];

    console.log('📝 Adding admin users to whitelist...');
    for (const user of adminUsers) {
      await setDoc(doc(db, 'whitelist', user.email), user);
      console.log(`✅ Added ${user.email} as ${user.role}`);
    }

    // Add sample published reports
    console.log('📄 Adding sample reports...');
    const sampleReports = [
      {
        title: 'Pushpa 2: The Rule - Full Movie Review',
        type: 'film_review',
        content: `# Pushpa 2: The Rule - Comprehensive Analysis

## Executive Summary
Allu Arjun returns with exceptional performance in this highly anticipated sequel that exceeds expectations. The film demonstrates remarkable character development, innovative action sequences, and strong regional storytelling that appeals to pan-Indian audiences.

## Detailed Analysis

### Narrative Structure (Score: 8.7/10)
The sequel builds effectively on the foundation established in the first film, with Pushpa Raj's character arc showing meaningful progression. The story maintains momentum while introducing new conflicts and deepening existing relationships.

### Creative Conceptualization (Score: 9.2/10)
Director Sukumar's vision remains consistent and compelling. The film successfully balances mass entertainment with nuanced character development, creating a unique identity within the action genre.

### Execution & Performance (Score: 9.1/10)
Technical aspects including cinematography, sound design, and production values are exceptional. Allu Arjun's performance anchors the film with charismatic screen presence and physical commitment to the role.`,
        summary: 'Allu Arjun returns with exceptional performance in this highly anticipated sequel that exceeds expectations...',
        greybrainerScore: 9.0,
        category: 'regional-cinema',
        tags: ['pushpa-2', 'allu-arjun', 'sukumar', 'action', 'regional-cinema', 'telugu'],
        authorEmail: 'system@greybrainer.ai',
        status: 'published',
        publishedAt: new Date(),
        createdAt: new Date(),
        viewCount: 1250,
        featured: true,
        metadata: {
          movieTitle: 'Pushpa 2: The Rule',
          reviewStage: 'Full Movie/Series Review',
          layerScores: {
            'STORY': 8.7,
            'CONCEPTUALIZATION': 9.2,
            'PERFORMANCE': 9.1
          }
        }
      },
      {
        title: 'The Rise of Regional OTT Content in Indian Cinema',
        type: 'research',
        content: `# The Rise of Regional OTT Content in Indian Cinema

## Introduction
The Indian OTT landscape has witnessed a remarkable transformation with regional content taking center stage. Platforms like Netflix, Amazon Prime Video, and Disney+ Hotstar are investing heavily in Tamil, Telugu, Malayalam, and other regional productions.

## Key Findings
This shift represents more than just content diversification—it's a fundamental change in how stories are told and consumed. Regional creators are bringing authentic narratives that resonate with local audiences while attracting global viewers through subtitles and dubbing.

## Market Analysis
Key factors driving this trend include:
- Increased smartphone penetration in tier-2 and tier-3 cities
- Growing comfort with digital payments
- Success stories like "Arya" (Tamil) and "The Family Man" (Hindi with regional elements)
- Cost-effectiveness of regional productions compared to big-budget Hindi films

## Implications
The implications are significant for the industry. Traditional Bollywood dominance is being challenged, and new talent pools are emerging. This democratization of content creation is likely to continue, with regional stories finding national and international audiences.`,
        summary: 'Regional language content is experiencing unprecedented growth on OTT platforms, reshaping the Indian entertainment landscape...',
        category: 'streaming-trends',
        tags: ['regional-cinema', 'ott-platforms', 'indian-cinema', 'streaming', 'content-diversity'],
        authorEmail: 'system@greybrainer.ai',
        status: 'published',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        viewCount: 845,
        featured: false
      }
    ];

    for (const report of sampleReports) {
      await addDoc(collection(db, 'reports'), report);
      console.log(`✅ Added sample report: ${report.title}`);
    }

    // Add sample subscribers
    console.log('📧 Adding sample subscribers...');
    const sampleSubscribers = [
      {
        email: 'subscriber1@example.com',
        subscribedAt: new Date(),
        preferences: ['reviews', 'research'],
        isActive: true,
        emailVerified: true
      },
      {
        email: 'subscriber2@example.com',
        subscribedAt: new Date(),
        preferences: ['reviews'],
        isActive: true,
        emailVerified: true
      }
    ];

    for (const subscriber of sampleSubscribers) {
      await setDoc(doc(db, 'subscribers', subscriber.email), subscriber);
      console.log(`✅ Added subscriber: ${subscriber.email}`);
    }

    console.log('🎉 Database initialization complete!');
    console.log('\n📋 Summary:');
    console.log(`   • ${adminUsers.length} users added to whitelist`);
    console.log(`   • ${sampleReports.length} sample reports created`);
    console.log(`   • ${sampleSubscribers.length} sample subscribers added`);
    console.log('\n🚀 Your Firebase database is ready!');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}

// Run initialization
initializeDatabase();