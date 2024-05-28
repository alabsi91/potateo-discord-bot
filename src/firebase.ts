import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore, setDoc, updateDoc } from 'firebase/firestore/lite';

import config from './.config.json' with { type: 'json' };
import { Log } from './logger.js';

import type { BotActivity, CustomCommands, FirebaseCache, FirebaseData, VoiceWelcomeMessage } from './types.js';

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig); // initialize firebase app.
const db = getFirestore(firebaseApp);

const cache: FirebaseCache = {};

const defaultData: FirebaseData = {
  voiceMessages: [],
  customCommands: [],
  savedList: [],
  prefix: config.prefix,
};

// * Get

async function getGuildData(guildId: string): Promise<FirebaseData> {
  const docRef = doc(db, 'Guilds', guildId);
  const docSnap = await getDoc(docRef);
  const exists = docSnap.exists();

  // no data found, create firebase doc entry for this guild
  if (!exists) {
    await createGuildDoc(guildId);
    return defaultData;
  }

  const data = docSnap.data() as FirebaseData;
  // check for missing fields
  if (!data.voiceMessages) {
    await updateDoc(docRef, { voiceMessages: defaultData.voiceMessages });
    data.voiceMessages = defaultData.voiceMessages;
  }

  if (!data.customCommands) {
    await updateDoc(docRef, { customCommands: defaultData.customCommands });
    data.customCommands = defaultData.customCommands;
  }

  if (!data.savedList) {
    await updateDoc(docRef, { savedList: defaultData.savedList });
    data.savedList = defaultData.savedList;
  }

  if (!data.prefix) {
    await updateDoc(docRef, { prefix: defaultData.prefix });
    data.prefix = defaultData.prefix;
  }

  return data;
}

export async function getCustomCommands(guildId: string): Promise<CustomCommands[] | null> {
  // get from cache
  if (cache[guildId]?.customCommands) return cache[guildId].customCommands;

  try {
    const data = await getGuildData(guildId);
    cache[guildId] = data; // save to cache
  } catch (error) {
    return null;
  }

  // return from cache
  return cache[guildId].customCommands;
}

export async function getSavedList(guildId: string): Promise<string[] | null> {
  // get from cache
  if (cache[guildId]?.savedList) return cache[guildId].savedList;

  try {
    const data = await getGuildData(guildId);
    cache[guildId] = data; // save to cache
  } catch (error) {
    return null;
  }

  // return from cache
  return cache[guildId].savedList;
}

export async function getVoiceWelcomeMessages(guildId: string): Promise<VoiceWelcomeMessage[] | null> {
  // get from cache
  if (cache[guildId]?.voiceMessages) return cache[guildId].voiceMessages;

  try {
    const data = await getGuildData(guildId);
    cache[guildId] = data; // save to cache
  } catch (error) {
    return null;
  }

  // return from cache
  return cache[guildId].voiceMessages;
}

export async function getBotActivity(): Promise<BotActivity | null> {
  try {
    const docRef = doc(db, 'Shared', 'bot');
    const data = await getDoc(docRef);
    if (!data.exists()) return { activity: '/', type: 'Listening' };
    return data.data().botActivity as BotActivity;
  } catch (error) {
    return null;
  }
}

export async function getCommandPrefix(guildId: string): Promise<string | null> {
  // get from cache
  if (cache[guildId]?.prefix) return cache[guildId].prefix;

  try {
    const data = await getGuildData(guildId);
    cache[guildId] = data; // save to cache
  } catch (error) {
    return null;
  }

  // return from cache
  return cache[guildId].prefix;
}

// * Set

export async function createGuildDoc(guildId: string) {
  const docRef = doc(db, 'Guilds', guildId);
  await setDoc(docRef, defaultData);
}

export async function setCustomCommands(guildId: string, customCommands: CustomCommands[]) {
  // check if cache exists for this guild
  if (!cache[guildId]) {
    Log.error('setCustomCommands: Firebase not initialized yet');
    throw new Error('Firebase not initialized yet');
  }

  const docRef = doc(db, 'Guilds', guildId);
  await updateDoc(docRef, { customCommands });

  // update cache
  cache[guildId].customCommands = customCommands;
}

export async function setSavedList(guildId: string, savedList: string[]) {
  // check if cache exists for this guild
  if (!cache[guildId]) {
    Log.error('setSavedList: Firebase not initialized yet');
    throw new Error('Firebase not initialized yet');
  }

  const docRef = doc(db, 'Guilds', guildId);
  await updateDoc(docRef, { savedList });

  // update cache
  cache[guildId].savedList = savedList;
}

export async function setBotActivity(data: BotActivity) {
  const docRef = doc(db, 'Shared', 'bot');
  await updateDoc(docRef, { botActivity: data });
}

export async function setVoiceWelcomeMessages(guildId: string, voiceMessages: VoiceWelcomeMessage[]) {
  // check if cache exists for this guild
  if (!cache[guildId]) {
    Log.error('setVoiceWelcomeMessages: Firebase not initialized yet');
    throw new Error('Firebase not initialized yet');
  }

  const docRef = doc(db, 'Guilds', guildId);
  await updateDoc(docRef, { voiceMessages });

  // update cache
  cache[guildId].voiceMessages = voiceMessages;
}

export async function setCommandPrefixMessages(guildId: string, prefix: string) {
  // check if cache exists for this guild
  if (!cache[guildId]) {
    Log.error('setCommandPrefixMessages: Firebase not initialized yet');
    throw new Error('Firebase not initialized yet');
  }

  const docRef = doc(db, 'Guilds', guildId);
  await updateDoc(docRef, { prefix });

  // update cache
  cache[guildId].prefix = prefix;
}
