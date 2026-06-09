import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDdWuwH2BAz9nSWVLXyC2uE8qoxl5QU3lY",
  projectId: "greybrainer",
  appId: "1:334602682761:web:a8cc82bd81a753a3392158"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addPranit() {
  const email = 'pranitskid@gmail.com';
  console.log("Adding " + email + " to whitelist...");
  await setDoc(doc(db, 'whitelist', email), {
    email: email,
    role: 'editor',
    isActive: true,
    addedBy: 'system',
    addedAt: new Date(),
    department: 'Film Analysis',
    name: 'pranitskid',
    status: 'active'
  });
  console.log("Done.");
  process.exit(0);
}
addPranit();
