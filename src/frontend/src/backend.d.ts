import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ExtendedUserProfile {
    bio: string;
    ratedEntries: Array<EntryRating>;
    submittedEntries: Array<bigint>;
    username: string;
    displayName: string;
    pinnedNfts: Array<{
        tokenId: bigint;
        collectionId: string;
    }>;
    socialLinks: SocialLinks;
    badges: Array<string>;
    joinedAt: Time;
    walletAddresses: WalletAddresses;
    bookmarks: Array<bigint>;
    avatarUrl?: string;
    bannerUrl?: string;
}
export type Time = bigint;
export interface WalletAddresses {
    btc?: string;
    eth?: string;
    sol?: string;
    hbar?: string;
}
export interface SocialLinks {
    twitter?: string;
    website?: string;
    discord?: string;
    telegram?: string;
    github?: string;
}
export interface PendingSubmission {
    id: bigint;
    status: Variant_pending_approved_rejected;
    submitter: Principal;
    submittedAt: Time;
    entry: BonsaiRegistryEntry;
    paymentMemo: string;
}
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
export interface EntryRatingStats {
    count: bigint;
    average: number;
}
export interface EntryRating {
    entryId: bigint;
    rating: bigint;
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
export enum Variant_pending_approved_rejected {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export interface backendInterface {
    addRegistryEntry(entry: BonsaiRegistryEntry): Promise<bigint>;
    addRegistryEntryWithSecret(secret: string, entry: BonsaiRegistryEntry): Promise<bigint>;
    approvePendingSubmissionWithSecret(secret: string, submissionId: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    bookmarkEntry(entryId: bigint): Promise<void>;
    bulkImportEntries(entries: Array<BonsaiRegistryEntry>): Promise<Array<bigint>>;
    bulkImportEntriesWithSecret(secret: string, entries: Array<BonsaiRegistryEntry>): Promise<Array<bigint>>;
    fullTextSearch(arg0: string, arg1: bigint, arg2: bigint): Promise<Array<BonsaiRegistryEntry>>;
    getAllBookmarkedEntries(): Promise<Array<bigint>>;
    getAllEntryRatings(): Promise<Array<[bigint, EntryRatingStats]>>;
    getAllRegistryEntries(offset: bigint, limit: bigint): Promise<Array<BonsaiRegistryEntry>>;
    getCallerAllRatings(): Promise<Array<[bigint, bigint]>>;
    getCallerRating(entryId: bigint): Promise<bigint | null>;
    getCallerUserProfile(): Promise<ExtendedUserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getEntriesByCategory(category: Category, offset: bigint, limit: bigint): Promise<Array<BonsaiRegistryEntry>>;
    getEntriesByEcosystem(ecosystem: string, offset: bigint, limit: bigint): Promise<Array<BonsaiRegistryEntry>>;
    getEntryRating(entryId: bigint): Promise<EntryRatingStats>;
    getListingFee(): Promise<bigint>;
    getPendingSubmissions(secret: string): Promise<Array<PendingSubmission>>;
    getPublicUserProfile(user: Principal): Promise<ExtendedUserProfile | null>;
    getTotalEntriesCount(): Promise<bigint>;
    isCallerAdmin(): Promise<boolean>;
    rateEntry(entryId: bigint, rating: bigint): Promise<void>;
    rejectPendingSubmissionWithSecret(secret: string, submissionId: bigint): Promise<void>;
    removeRegistryEntry(id: bigint): Promise<void>;
    removeRegistryEntryWithSecret(secret: string, id: bigint): Promise<void>;
    saveCallerUserProfile(profile: ExtendedUserProfile): Promise<void>;
    setListingFeeWithSecret(secret: string, fee: bigint): Promise<void>;
    submitProjectListing(entry: BonsaiRegistryEntry, paymentMemo: string): Promise<bigint>;
    unbookmarkEntry(entryId: bigint): Promise<void>;
    updateRegistryEntry(id: bigint, newEntry: BonsaiRegistryEntry): Promise<void>;
    updateRegistryEntryWithSecret(secret: string, id: bigint, newEntry: BonsaiRegistryEntry): Promise<void>;
}
