import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { Profile, WardrobeItem, Analysis } from "@/types";

const dbPath = path.join(process.cwd(), ".localdb.json");

interface LocalDb {
  profiles: Profile[];
  wardrobe_items: WardrobeItem[];
  analyses: Analysis[];
}

async function readDb(): Promise<LocalDb> {
  try {
    const data = await fs.readFile(dbPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { profiles: [], wardrobe_items: [], analyses: [] };
  }
}

async function writeDb(db: LocalDb): Promise<void> {
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2), "utf-8");
}

export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const db = await readDb();
  return db.profiles.find((p) => p.email === email) || null;
}

export async function upsertProfile(profile: Profile): Promise<Profile> {
  const db = await readDb();
  const index = db.profiles.findIndex((p) => p.email === profile.email || p.id === profile.id);
  if (index > -1) {
    db.profiles[index] = { ...db.profiles[index], ...profile };
  } else {
    db.profiles.push(profile);
  }
  await writeDb(db);
  return db.profiles.find((p) => p.id === profile.id)!;
}

export async function addWardrobeItem(item: Omit<WardrobeItem, "id" | "created_at">): Promise<WardrobeItem> {
  const db = await readDb();
  const newItem: WardrobeItem = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...item,
  };
  db.wardrobe_items.push(newItem);
  await writeDb(db);
  return newItem;
}

export async function deleteWardrobeItem(id: string, userId: string): Promise<void> {
  const db = await readDb();
  db.wardrobe_items = db.wardrobe_items.filter(
    (item) => !(item.id === id && String(item.user_id) === String(userId))
  );
  await writeDb(db);
}

export async function listWardrobeItems(userId: string): Promise<WardrobeItem[]> {
  const db = await readDb();
  return db.wardrobe_items
    .filter((item) => String(item.user_id) === String(userId))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function addAnalysis(analysis: Omit<Analysis, "id" | "created_at">): Promise<Analysis> {
  const db = await readDb();
  const newAnalysis: Analysis = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...analysis,
  };
  db.analyses.push(newAnalysis);
  await writeDb(db);
  return newAnalysis;
}

export async function listAnalyses(userId: string): Promise<Analysis[]> {
  const db = await readDb();
  return db.analyses
    .filter((analysis) => String(analysis.user_id) === String(userId))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
