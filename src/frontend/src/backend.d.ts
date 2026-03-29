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
    oisyPrincipal?: [] | [string];
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
export interface EmailSubscriber {
    subscribedAt: Time;
    source: string;
    email: string;
    principalId?: string;
    oisyPrincipal?: string;
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
export interface AmbassadorSocialLinks {
    twitter: [] | [string];
    instagram: [] | [string];
    youtube: [] | [string];
    tiktok: [] | [string];
    website: [] | [string];
}
export interface AmbassadorMediaItem {
    url: string;
    mediaType: string;
    caption: string;
}
export interface AmbassadorProfile {
    principalId: string;
    displayName: string;
    bio: string;
    avatarUrl: string;
    bannerUrl: string;
    socialLinks: AmbassadorSocialLinks;
    mediaItems: Array<AmbassadorMediaItem>;
    customTerms: string;
    pricePerCampaign: number;
    currency: string;
    joinedAt: bigint;
    status: { pending: null } | { approved: null } | { suspended: null };
    tags: string[];
    agreedToPlatformTerms: boolean;
}
export interface DaoVote {
    voter: string;
    contractId: string;
    vote: { approve_influencer: null } | { approve_client: null } | { dismiss: null };
    comment: string;
    timestamp: bigint;
}
export interface CreatorContract {
    id: string;
    influencerPrincipal: string;
    clientPrincipal: string;
    campaignTitle: string;
    description: string;
    deliverables: string;
    priceInCkUSDC: number;
    influencerTermsSnapshot: string;
    clientAgreedAt: [] | [bigint];
    status: { draft: null } | { pending_agreement: null } | { active: null } | { completed: null } | { disputed: null } | { resolved: null };
    createdAt: bigint;
    completedAt: [] | [bigint];
    disputeReason: string;
    daoVotes: Array<DaoVote>;
    resolvedBy: string;
}
export interface BonsaiApprovedEntry {
    principalId: string;
    oisyPrincipal: string;
    email: string;
    approvedAt: bigint;
}
export interface CommunityComment {
    id: bigint;
    entryId: bigint;
    author: Principal;
    authorName: string;
    text: string;
    createdAt: Time;
    parentId: [] | [bigint];
    flagCount: bigint;
    deleted: boolean;
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
    getAllSubscribersWithSecret(secret: string): Promise<Array<EmailSubscriber>>;
    getBannerAdsJson(): Promise<string>;
    getEcosystemOrder(): Promise<string>;
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
    getSubscriberCount(): Promise<bigint>;
    getTotalEntriesCount(): Promise<bigint>;
    isCallerAdmin(): Promise<boolean>;
    linkEmailToPrincipal(email: string): Promise<void>;
    rateEntry(entryId: bigint, rating: bigint): Promise<void>;
    rejectPendingSubmissionWithSecret(secret: string, submissionId: bigint): Promise<void>;
    removeRegistryEntry(id: bigint): Promise<void>;
    removeRegistryEntryWithSecret(secret: string, id: bigint): Promise<void>;
    saveBannerAdsWithSecret(secret: string, adsJson: string): Promise<void>;
    saveEcosystemOrderWithSecret(secret: string, orderJson: string): Promise<void>;
    saveCallerUserProfile(profile: ExtendedUserProfile): Promise<void>;
    setListingFeeWithSecret(secret: string, fee: bigint): Promise<void>;
    submitProjectListing(entry: BonsaiRegistryEntry, paymentMemo: string): Promise<bigint>;
    submitCommunityEntry(entry: BonsaiRegistryEntry): Promise<bigint>;
    subscribeEmail(email: string, oisyPrincipal: string, source: string): Promise<void>;
    unbookmarkEntry(entryId: bigint): Promise<void>;
    updateRegistryEntry(id: bigint, newEntry: BonsaiRegistryEntry): Promise<void>;
    updateRegistryEntryWithSecret(secret: string, id: bigint, newEntry: BonsaiRegistryEntry): Promise<void>;
    // Community upvotes
    upvoteEntry(entryId: bigint): Promise<boolean>;
    getEntryUpvotes(entryId: bigint): Promise<bigint>;
    hasCallerUpvoted(entryId: bigint): Promise<boolean>;
    getTopUpvotedEntries(limit: bigint): Promise<Array<[bigint, bigint]>>;
    getCommunitySpotlight(): Promise<bigint | null>;
    // Community comments
    addComment(entryId: bigint, text: string): Promise<bigint>;
    replyToComment(parentCommentId: bigint, text: string): Promise<bigint>;
    getComments(entryId: bigint): Promise<Array<CommunityComment>>;
    getFlaggedComments(secret: string): Promise<Array<CommunityComment>>;
    flagComment(commentId: bigint): Promise<void>;
    deleteCommentWithSecret(secret: string, commentId: bigint): Promise<void>;
    // Ambassador
    registerAmbassador(profile: AmbassadorProfile): Promise<void>;
    getAmbassadorProfile(principalId: string): Promise<AmbassadorProfile | null>;
    saveAmbassadorProfile(profile: AmbassadorProfile): Promise<void>;
    getAllAmbassadors(): Promise<Array<AmbassadorProfile>>;
    getApprovedAmbassadors(): Promise<Array<AmbassadorProfile>>;
    approveAmbassadorWithSecret(secret: string, principalId: string): Promise<void>;
    suspendAmbassadorWithSecret(secret: string, principalId: string): Promise<void>;
    createContract(influencerPrincipal: string, campaignTitle: string, description: string, deliverables: string, priceInCkUSDC: number): Promise<string>;
    clientAgreeToTerms(contractId: string): Promise<void>;
    markContractComplete(contractId: string): Promise<void>;
    disputeContract(contractId: string, reason: string): Promise<void>;
    voteOnContract(contractId: string, vote: { approve_influencer: null } | { approve_client: null } | { dismiss: null }, comment: string): Promise<void>;
    resolveContractWithSecret(secret: string, contractId: string, resolution: string): Promise<void>;
    getContract(contractId: string): Promise<CreatorContract | null>;
    getContractsByAmbassador(principalId: string): Promise<Array<CreatorContract>>;
    getContractsByClient(principalId: string): Promise<Array<CreatorContract>>;
    getAllPublicContracts(): Promise<Array<CreatorContract>>;
    getDisputedContracts(): Promise<Array<CreatorContract>>;
    markBonsaiApprovedWithSecret(secret: string, principalId: string, oisyPrincipal: string, email: string): Promise<void>;
    getBonsaiApprovedListWithSecret(secret: string): Promise<Array<BonsaiApprovedEntry>>;
    isBonsaiApproved(principalId: string): Promise<boolean>;
}
