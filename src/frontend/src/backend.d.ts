import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface BonsaiRegistryEntry {
    id: bigint;
    url: string;
    categories: Array<Category>;
    name: string;
    createdAt: Time;
    tier: bigint;
    ecosystem: string;
    description: string;
    logoUrl?: string;
}
export type Time = bigint;
export interface EntryRatingStats {
    count: bigint;
    average: number;
}
export interface UserProfile {
    name: string;
}
export enum Category {
    nft = "nft",
    tools = "tools",
    social = "social",
    defi = "defi",
    gaming = "gaming",
    wallet = "wallet",
    commerce = "commerce",
    exchange = "exchange"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addRegistryEntry(entry: BonsaiRegistryEntry): Promise<bigint>;
    addRegistryEntryWithSecret(secret: string, entry: BonsaiRegistryEntry): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    bulkImportEntries(entries: Array<BonsaiRegistryEntry>): Promise<Array<bigint>>;
    bulkImportEntriesWithSecret(secret: string, entries: Array<BonsaiRegistryEntry>): Promise<Array<bigint>>;
    fullTextSearch(arg0: string, arg1: bigint, arg2: bigint): Promise<Array<BonsaiRegistryEntry>>;
    getAllEntryRatings(): Promise<Array<[bigint, EntryRatingStats]>>;
    getAllRegistryEntries(offset: bigint, limit: bigint): Promise<Array<BonsaiRegistryEntry>>;
    getCallerAllRatings(): Promise<Array<[bigint, bigint]>>;
    getCallerRating(entryId: bigint): Promise<bigint | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getEntriesByCategory(category: Category, offset: bigint, limit: bigint): Promise<Array<BonsaiRegistryEntry>>;
    getEntriesByEcosystem(ecosystem: string, offset: bigint, limit: bigint): Promise<Array<BonsaiRegistryEntry>>;
    getEntryRating(entryId: bigint): Promise<EntryRatingStats>;
    getTotalEntriesCount(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    rateEntry(entryId: bigint, rating: bigint): Promise<void>;
    removeRegistryEntry(id: bigint): Promise<void>;
    removeRegistryEntryWithSecret(secret: string, id: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateRegistryEntry(id: bigint, newEntry: BonsaiRegistryEntry): Promise<void>;
    updateRegistryEntryWithSecret(secret: string, id: bigint, newEntry: BonsaiRegistryEntry): Promise<void>;
}
