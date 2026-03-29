import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Float "mo:core/Float";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Set "mo:core/Set";

actor {

  // ============================================================
  // SHARED TYPES (unchanged between versions)
  // ============================================================

  public type SocialLinks = {
    twitter : ?Text;
    github : ?Text;
    discord : ?Text;
    telegram : ?Text;
    website : ?Text;
  };

  public type WalletAddresses = {
    eth : ?Text;
    btc : ?Text;
    hbar : ?Text;
    sol : ?Text;
  };

  public type EntryRating = {
    entryId : Nat;
    rating : Nat;
  };

  // ============================================================
  // MIGRATION V1 TYPES — keep exact old names for stable compat
  // ============================================================

  type CategoryOld = {
    #gaming; #defi; #nft; #wallet; #exchange; #social; #tools; #commerce;
  };

  type BonsaiRegistryEntryOld = {
    id : Nat;
    name : Text;
    description : Text;
    url : Text;
    ecosystem : Text;
    categories : [CategoryOld];
    tier : Nat;
    logoUrl : ?Text;
    createdAt : Time.Time;
  };

  type EmailSubscriberOld = {
    email : Text;
    principalId : ?Text;
    subscribedAt : Time.Time;
    source : Text;
  };

  type PrivateUserProfileOld = {
    username : Text;
    displayName : Text;
    bio : Text;
    bannerUrl : ?Text;
    avatarUrl : ?Text;
    socialLinks : SocialLinks;
    walletAddresses : WalletAddresses;
    joinedAt : Time.Time;
    pinnedNfts : [{ collectionId : Text; tokenId : Nat }];
    bookmarks : Set.Set<Nat>;
    ratedEntries : [EntryRating];
    submittedEntries : [Nat];
    badges : [Text];
  };

  type PendingSubmissionOld = {
    id : Nat;
    submitter : Principal;
    entry : BonsaiRegistryEntryOld;
    paymentMemo : Text;
    submittedAt : Time.Time;
    status : { #pending; #approved; #rejected };
  };

  // ============================================================
  // CURRENT TYPES (V2)
  // ============================================================

  public type Category = {
    #gaming; #defi; #nft; #wallet; #exchange; #social; #tools; #commerce; #cloud_hosting;
  };

  public type BonsaiRegistryEntry = {
    id : Nat;
    name : Text;
    description : Text;
    url : Text;
    ecosystem : Text;
    categories : [Category];
    tier : Nat;
    logoUrl : ?Text;
    createdAt : Time.Time;
  };

  public type ExtendedUserProfile = {
    username : Text;
    displayName : Text;
    bio : Text;
    bannerUrl : ?Text;
    avatarUrl : ?Text;
    socialLinks : SocialLinks;
    walletAddresses : WalletAddresses;
    oisyPrincipal : ?Text;
    joinedAt : Time.Time;
    pinnedNfts : [{ collectionId : Text; tokenId : Nat }];
    bookmarks : [Nat];
    ratedEntries : [EntryRating];
    submittedEntries : [Nat];
    badges : [Text];
  };

  public type EntryRatingStats = {
    average : Float;
    count : Nat;
  };

  public type PendingSubmission = {
    id : Nat;
    submitter : Principal;
    entry : BonsaiRegistryEntry;
    paymentMemo : Text;
    submittedAt : Time.Time;
    status : { #pending; #approved; #rejected };
  };

  type PrivateUserProfile = {
    username : Text;
    displayName : Text;
    bio : Text;
    bannerUrl : ?Text;
    avatarUrl : ?Text;
    socialLinks : SocialLinks;
    walletAddresses : WalletAddresses;
    oisyPrincipal : ?Text;
    joinedAt : Time.Time;
    pinnedNfts : [{ collectionId : Text; tokenId : Nat }];
    bookmarks : Set.Set<Nat>;
    ratedEntries : [EntryRating];
    submittedEntries : [Nat];
    badges : [Text];
  };

  public type EmailSubscriber = {
    email : Text;
    oisyPrincipal : Text;
    principalId : ?Text;
    subscribedAt : Time.Time;
    source : Text;
  };

  // Community types
  public type CommunityComment = {
    id : Nat;
    entryId : Nat;
    author : Principal;
    authorName : Text;
    text : Text;
    createdAt : Time.Time;
    parentId : ?Nat;
    flagCount : Nat;
    deleted : Bool;
  };

  // Ambassador / Influencer types
  public type AmbassadorSocialLinks = {
    twitter : ?Text;
    instagram : ?Text;
    youtube : ?Text;
    tiktok : ?Text;
    website : ?Text;
  };

  public type MediaItem = {
    url : Text;
    mediaType : Text;
    caption : Text;
  };

  public type AmbassadorStatus = {
    #pending;
    #approved;
    #suspended;
  };

  public type AmbassadorProfile = {
    principalId : Text;
    displayName : Text;
    bio : Text;
    avatarUrl : Text;
    bannerUrl : Text;
    socialLinks : AmbassadorSocialLinks;
    mediaItems : [MediaItem];
    customTerms : Text;
    pricePerCampaign : Float;
    currency : Text;
    joinedAt : Time.Time;
    status : AmbassadorStatus;
    tags : [Text];
    agreedToPlatformTerms : Bool;
  };

  public type DAOVoteChoice = {
    #approve_influencer;
    #approve_client;
    #dismiss;
  };

  public type DAOVote = {
    voter : Text;
    contractId : Text;
    vote : DAOVoteChoice;
    comment : Text;
    timestamp : Time.Time;
  };

  public type ContractStatus = {
    #draft;
    #pending_agreement;
    #active;
    #completed;
    #disputed;
    #resolved;
  };

  public type CreatorContract = {
    id : Text;
    influencerPrincipal : Text;
    clientPrincipal : Text;
    campaignTitle : Text;
    description : Text;
    deliverables : Text;
    priceInCkUSDC : Float;
    influencerTermsSnapshot : Text;
    clientAgreedAt : ?Time.Time;
    status : ContractStatus;
    createdAt : Time.Time;
    completedAt : ?Time.Time;
    disputeReason : Text;
    daoVotes : [DAOVote];
    resolvedBy : Text;
  };

  public type BonsaiApprovedEntry = {
    principalId : Text;
    oisyPrincipal : Text;
    email : Text;
    approvedAt : Time.Time;
  };

  // ============================================================
  // STABLE STORAGE — old names hold V1 data from disk on upgrade
  // ============================================================

  // V1 maps (read existing stable data; NOT written after migration)
  let bonsaiRegistryEntries = Map.empty<Nat, BonsaiRegistryEntryOld>();
  let emailSubscribers = Map.empty<Text, EmailSubscriberOld>();
  let pendingSubmissions = Map.empty<Nat, PendingSubmissionOld>();
  let userProfiles = Map.empty<Principal, PrivateUserProfileOld>();

  // V2 maps (active post-migration)
  let entries_v2 = Map.empty<Nat, BonsaiRegistryEntry>();
  let subscribers_v2 = Map.empty<Text, EmailSubscriber>();
  let submissions_v2 = Map.empty<Nat, PendingSubmission>();
  let profiles_v2 = Map.empty<Principal, PrivateUserProfile>();

  // Migration flag
  stable var _migrationV1Done : Bool = false;

  // Other stable state (unchanged types — no migration needed)
  var nextId = 1;
  let ratings = Map.empty<Text, Nat>();
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  var listingFeeE8s = 100_000_000 : Nat;
  var bannerAdsJson : Text = "";
  var ecosystemOrderJson : Text = "";

  // Ambassador / Contract stores
  let ambassadorProfiles = Map.empty<Text, AmbassadorProfile>();
  let creatorContracts = Map.empty<Text, CreatorContract>();
  var nextContractId = 1;

  let bonsaiApprovedList = Map.empty<Text, BonsaiApprovedEntry>();

  // Community feature stores
  // upvotes: key = "principalId:entryId", value = timestamp
  let upvotes = Map.empty<Text, Time.Time>();
  // comments
  let comments = Map.empty<Nat, CommunityComment>();
  var nextCommentId = 1;
  // flagged comments: key = "principalId:commentId"
  let commentFlags = Map.empty<Text, Bool>();

  // ============================================================
  // MIGRATION: run once after upgrade from V1
  // ============================================================

  func migrateCategoryOld(c : CategoryOld) : Category {
    switch c {
      case (#gaming) #gaming;
      case (#defi) #defi;
      case (#nft) #nft;
      case (#wallet) #wallet;
      case (#exchange) #exchange;
      case (#social) #social;
      case (#tools) #tools;
      case (#commerce) #commerce;
    };
  };

  func migrateEntryOld(old : BonsaiRegistryEntryOld) : BonsaiRegistryEntry {
    {
      id = old.id;
      name = old.name;
      description = old.description;
      url = old.url;
      ecosystem = old.ecosystem;
      categories = old.categories.map(migrateCategoryOld);
      tier = old.tier;
      logoUrl = old.logoUrl;
      createdAt = old.createdAt;
    };
  };

  system func postupgrade() {
    if (not _migrationV1Done) {
      // Migrate registry entries
      for ((id, old) in bonsaiRegistryEntries.entries()) {
        entries_v2.add(id, migrateEntryOld(old));
      };
      // Migrate email subscribers
      for ((email, old) in emailSubscribers.entries()) {
        let newSub : EmailSubscriber = {
          email = old.email;
          oisyPrincipal = "";
          principalId = old.principalId;
          subscribedAt = old.subscribedAt;
          source = old.source;
        };
        subscribers_v2.add(email, newSub);
      };
      // Migrate pending submissions
      for ((id, old) in pendingSubmissions.entries()) {
        let newSub : PendingSubmission = {
          id = old.id;
          submitter = old.submitter;
          entry = migrateEntryOld(old.entry);
          paymentMemo = old.paymentMemo;
          submittedAt = old.submittedAt;
          status = old.status;
        };
        submissions_v2.add(id, newSub);
      };
      // Migrate user profiles
      for ((principal, old) in userProfiles.entries()) {
        let newProfile : PrivateUserProfile = {
          username = old.username;
          displayName = old.displayName;
          bio = old.bio;
          bannerUrl = old.bannerUrl;
          avatarUrl = old.avatarUrl;
          socialLinks = old.socialLinks;
          walletAddresses = old.walletAddresses;
          oisyPrincipal = null;
          joinedAt = old.joinedAt;
          pinnedNfts = old.pinnedNfts;
          bookmarks = old.bookmarks;
          ratedEntries = old.ratedEntries;
          submittedEntries = old.submittedEntries;
          badges = old.badges;
        };
        profiles_v2.add(principal, newProfile);
      };
      _migrationV1Done := true;
    };
  };

  // ============================================================
  // HELPERS
  // ============================================================

  let ADMIN_SECRET : Text = "#WakeUp4";

  func requireAdminSecret(secret : Text) {
    if (not Text.equal(secret, ADMIN_SECRET)) {
      Runtime.trap("Unauthorized: Invalid admin secret");
    };
  };

  func requireAdminSecretAndRole(_caller : Principal, secret : Text) {
    requireAdminSecret(secret);
  };

  func requireAuthenticated(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
  };

  func ensureProfileExists(caller : Principal) {
    if (caller.isAnonymous()) { return };
    switch (profiles_v2.get(caller)) {
      case (?_) {};
      case (null) {
        let newProfile : PrivateUserProfile = {
          username = ""; displayName = "New User"; bio = ""; bannerUrl = null; avatarUrl = null;
          socialLinks = { twitter = null; github = null; discord = null; telegram = null; website = null };
          walletAddresses = { eth = null; btc = null; hbar = null; sol = null };
          oisyPrincipal = null;
          joinedAt = Time.now(); pinnedNfts = []; bookmarks = Set.empty<Nat>();
          ratedEntries = []; submittedEntries = []; badges = [];
        };
        profiles_v2.add(caller, newProfile);
      };
    };
  };

  func toExtendedUserProfile(p : PrivateUserProfile) : ExtendedUserProfile {
    {
      username = p.username; displayName = p.displayName; bio = p.bio;
      bannerUrl = p.bannerUrl; avatarUrl = p.avatarUrl; socialLinks = p.socialLinks;
      walletAddresses = p.walletAddresses; oisyPrincipal = p.oisyPrincipal;
      joinedAt = p.joinedAt; pinnedNfts = p.pinnedNfts;
      bookmarks = p.bookmarks.toArray(); ratedEntries = p.ratedEntries;
      submittedEntries = p.submittedEntries; badges = p.badges;
    };
  };

  func fromExtendedUserProfile(profile : ExtendedUserProfile) : PrivateUserProfile {
    let bookmarksSet = Set.empty<Nat>();
    for (b in profile.bookmarks.values()) { bookmarksSet.add(b) };
    {
      username = profile.username; displayName = profile.displayName; bio = profile.bio;
      bannerUrl = profile.bannerUrl; avatarUrl = profile.avatarUrl;
      socialLinks = profile.socialLinks; walletAddresses = profile.walletAddresses;
      oisyPrincipal = profile.oisyPrincipal;
      joinedAt = profile.joinedAt; pinnedNfts = profile.pinnedNfts;
      bookmarks = bookmarksSet; ratedEntries = profile.ratedEntries;
      submittedEntries = profile.submittedEntries; badges = profile.badges;
    };
  };

  func grantBadge(principal : Principal, badge : Text) {
    switch (profiles_v2.get(principal)) {
      case (null) {};
      case (?p) {
        if (not p.badges.any(func(b) { Text.equal(b, badge) })) {
          profiles_v2.add(principal, { p with badges = p.badges.concat([badge]) });
        };
      };
    };
  };

  // ============================================================
  // USER PROFILE FUNCTIONS
  // ============================================================

  public query ({ caller }) func getCallerUserProfile() : async ?ExtendedUserProfile {
    if (caller.isAnonymous()) { return null };
    switch (profiles_v2.get(caller)) {
      case (null) { null };
      case (?p) { ?toExtendedUserProfile(p) };
    };
  };

  public query ({ caller }) func getPublicUserProfile(user : Principal) : async ?ExtendedUserProfile {
    switch (profiles_v2.get(user)) {
      case (null) { null };
      case (?p) { ?toExtendedUserProfile(p) };
    };
  };

  public query ({ caller }) func getUserProfileByUsername(username : Text) : async ?ExtendedUserProfile {
    let found = profiles_v2.values().filter(
      func(p) { Text.equal(p.username, username) }
    ).toArray();
    if (found.size() == 0) { null } else { ?toExtendedUserProfile(found[0]) };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : ExtendedUserProfile) : async () {
    requireAuthenticated(caller);
    profiles_v2.add(caller, fromExtendedUserProfile(profile));
  };

  public shared ({ caller }) func bookmarkEntry(entryId : Nat) : async () {
    requireAuthenticated(caller);
    ensureProfileExists(caller);
    switch (profiles_v2.get(caller)) {
      case (null) { Runtime.trap("Profile not found") };
      case (?p) {
        if (p.bookmarks.contains(entryId)) { Runtime.trap("Entry already bookmarked") };
        p.bookmarks.add(entryId);
        profiles_v2.add(caller, p);
      };
    };
  };

  public shared ({ caller }) func unbookmarkEntry(entryId : Nat) : async () {
    requireAuthenticated(caller);
    ensureProfileExists(caller);
    switch (profiles_v2.get(caller)) {
      case (null) { Runtime.trap("Profile not found") };
      case (?p) {
        if (not p.bookmarks.contains(entryId)) { Runtime.trap("Bookmark does not exist") };
        p.bookmarks.remove(entryId);
        profiles_v2.add(caller, p);
      };
    };
  };

  public query ({ caller }) func getAllBookmarkedEntries() : async [Nat] {
    if (caller.isAnonymous()) { return [] };
    switch (profiles_v2.get(caller)) {
      case (null) { [] };
      case (?p) { p.bookmarks.toArray() };
    };
  };

  // ============================================================
  // REGISTRY FUNCTIONS
  // ============================================================

  public query ({ caller }) func getListingFee() : async Nat { listingFeeE8s };

  public shared ({ caller }) func setListingFeeWithSecret(secret : Text, fee : Nat) : async () {
    requireAdminSecretAndRole(caller, secret);
    listingFeeE8s := fee;
  };

  public shared ({ caller }) func submitProjectListing(entry : BonsaiRegistryEntry, paymentMemo : Text) : async Nat {
    requireAuthenticated(caller);
    ensureProfileExists(caller);
    let submissionId = nextId;
    let submission : PendingSubmission = {
      id = submissionId; submitter = caller; entry; paymentMemo;
      submittedAt = Time.now(); status = #pending;
    };
    submissions_v2.add(submissionId, submission);
    nextId += 1;
    switch (profiles_v2.get(caller)) {
      case (null) { Runtime.trap("Profile not found") };
      case (?p) {
        profiles_v2.add(caller, { p with submittedEntries = p.submittedEntries.concat([submissionId]) });
      };
    };
    submissionId;
  };

  // Free community submission (no payment required)
  public shared ({ caller }) func submitCommunityEntry(entry : BonsaiRegistryEntry) : async Nat {
    requireAuthenticated(caller);
    ensureProfileExists(caller);
    let submissionId = nextId;
    let submission : PendingSubmission = {
      id = submissionId; submitter = caller; entry;
      paymentMemo = "community";
      submittedAt = Time.now(); status = #pending;
    };
    submissions_v2.add(submissionId, submission);
    nextId += 1;
    switch (profiles_v2.get(caller)) {
      case (null) {};
      case (?p) {
        profiles_v2.add(caller, { p with submittedEntries = p.submittedEntries.concat([submissionId]) });
      };
    };
    submissionId;
  };

  public query ({ caller }) func getPendingSubmissions(secret : Text) : async [PendingSubmission] {
    requireAdminSecret(secret);
    submissions_v2.values().toArray();
  };

  public shared ({ caller }) func approvePendingSubmissionWithSecret(secret : Text, submissionId : Nat) : async () {
    requireAdminSecretAndRole(caller, secret);
    switch (submissions_v2.get(submissionId)) {
      case (null) { Runtime.trap("Submission not found") };
      case (?sub) {
        let newEntry = { sub.entry with id = nextId; createdAt = Time.now() };
        entries_v2.add(nextId, newEntry);
        nextId += 1;
        submissions_v2.add(submissionId, { sub with status = #approved });
        // Grant Contributor badge for community submissions
        if (Text.equal(sub.paymentMemo, "community")) {
          grantBadge(sub.submitter, "Contributor");
        };
      };
    };
  };

  public shared ({ caller }) func rejectPendingSubmissionWithSecret(secret : Text, submissionId : Nat) : async () {
    requireAdminSecretAndRole(caller, secret);
    switch (submissions_v2.get(submissionId)) {
      case (null) { Runtime.trap("Submission not found") };
      case (?sub) {
        submissions_v2.add(submissionId, { sub with status = #rejected });
      };
    };
  };

  public query ({ caller }) func getAllRegistryEntries(offset : Nat, limit : Nat) : async [BonsaiRegistryEntry] {
    let all = entries_v2.values().toArray();
    all.sliceToArray(offset, Nat.min(offset + limit, all.size()));
  };

  public query ({ caller }) func getEntriesByEcosystem(ecosystem : Text, offset : Nat, limit : Nat) : async [BonsaiRegistryEntry] {
    let filtered = entries_v2.values().toArray().filter(
      func(e) { Text.equal(e.ecosystem, ecosystem) }
    );
    filtered.sliceToArray(offset, Nat.min(offset + limit, filtered.size()));
  };

  public query ({ caller }) func getEntriesByCategory(category : Category, offset : Nat, limit : Nat) : async [BonsaiRegistryEntry] {
    let filtered = entries_v2.values().toArray().filter(
      func(e) { e.categories.any(func(c) { c == category }) }
    );
    filtered.sliceToArray(offset, Nat.min(offset + limit, filtered.size()));
  };

  public query ({ caller }) func fullTextSearch(_ : Text, _ : Nat, _ : Nat) : async [BonsaiRegistryEntry] {
    Runtime.trap("Full-text search not yet implemented.");
  };

  public query ({ caller }) func getTotalEntriesCount() : async Nat {
    entries_v2.size();
  };

  public shared ({ caller }) func addRegistryEntry(entry : BonsaiRegistryEntry) : async Nat {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can add entries");
    };
    let entryId = nextId;
    entries_v2.add(entryId, { entry with id = entryId; createdAt = Time.now() });
    nextId += 1;
    entryId;
  };

  public shared ({ caller }) func updateRegistryEntry(id : Nat, newEntry : BonsaiRegistryEntry) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can update entries");
    };
    if (not entries_v2.containsKey(id)) { Runtime.trap("Entry not found") };
    entries_v2.add(id, newEntry);
  };

  public shared ({ caller }) func removeRegistryEntry(id : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can remove entries");
    };
    entries_v2.remove(id);
  };

  public shared ({ caller }) func bulkImportEntries(entries : [BonsaiRegistryEntry]) : async [Nat] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can import entries");
    };
    let idList = List.empty<Nat>();
    for (entry in entries.values()) {
      let entryId = nextId;
      entries_v2.add(entryId, { entry with id = entryId; createdAt = Time.now() });
      idList.add(entryId);
      nextId += 1;
    };
    idList.toArray();
  };

  public shared ({ caller }) func addRegistryEntryWithSecret(secret : Text, entry : BonsaiRegistryEntry) : async Nat {
    requireAdminSecretAndRole(caller, secret);
    let entryId = nextId;
    entries_v2.add(entryId, { entry with id = entryId; createdAt = Time.now() });
    nextId += 1;
    entryId;
  };

  public shared ({ caller }) func updateRegistryEntryWithSecret(secret : Text, id : Nat, newEntry : BonsaiRegistryEntry) : async () {
    requireAdminSecretAndRole(caller, secret);
    if (not entries_v2.containsKey(id)) { Runtime.trap("Entry not found") };
    entries_v2.add(id, newEntry);
  };

  public shared ({ caller }) func removeRegistryEntryWithSecret(secret : Text, id : Nat) : async () {
    requireAdminSecretAndRole(caller, secret);
    entries_v2.remove(id);
  };

  public shared ({ caller }) func bulkImportEntriesWithSecret(secret : Text, entries : [BonsaiRegistryEntry]) : async [Nat] {
    requireAdminSecretAndRole(caller, secret);
    let idList = List.empty<Nat>();
    for (entry in entries.values()) {
      let normalizedUrl = entry.url.trim(#char ' ');
      let isDuplicate = entries_v2.values().any(
        func(e) { Text.equal(e.url.trim(#char ' '), normalizedUrl) }
      );
      if (not isDuplicate) {
        let entryId = nextId;
        entries_v2.add(entryId, { entry with id = entryId; createdAt = Time.now() });
        idList.add(entryId);
        nextId += 1;
      };
    };
    idList.toArray();
  };

  // ============================================================
  // RATINGS
  // ============================================================

  public shared ({ caller }) func rateEntry(entryId : Nat, rating : Nat) : async () {
    requireAuthenticated(caller);
    ensureProfileExists(caller);
    if (rating < 1 or rating > 5) { Runtime.trap("Invalid rating value: Must be between 1 and 5") };
    if (not entries_v2.containsKey(entryId)) { Runtime.trap("Entry not found") };
    ratings.add(caller.toText() # ":" # entryId.toText(), rating);
  };

  func calculateEntryRating(entryId : Nat) : EntryRatingStats {
    var sum = 0; var count = 0;
    ratings.entries().filter(
      func((key, _)) {
        let parts = key.split(#char ':').toArray();
        parts.size() == 2 and parts[1] == entryId.toText();
      }
    ).forEach(func((_key, r)) { sum += r; count += 1 });
    if (count == 0) { { average = 0.0; count = 0 } }
    else { { average = sum.toFloat() / count.toFloat(); count } };
  };

  public query ({ caller }) func getEntryRating(entryId : Nat) : async EntryRatingStats {
    calculateEntryRating(entryId);
  };

  public query ({ caller }) func getAllEntryRatings() : async [(Nat, EntryRatingStats)] {
    entries_v2.values().toArray().map(func(e) { (e.id, calculateEntryRating(e.id)) });
  };

  public query ({ caller }) func getCallerRating(entryId : Nat) : async ?Nat {
    if (caller.isAnonymous()) { return null };
    ratings.get(caller.toText() # ":" # entryId.toText());
  };

  public query ({ caller }) func getCallerAllRatings() : async [(Nat, Nat)] {
    if (caller.isAnonymous()) { return [] };
    ratings.toArray().filter(
      func((key, _)) {
        let parts = key.split(#char ':').toArray();
        parts.size() == 2 and parts[0] == caller.toText();
      }
    ).map(func((key, rating)) {
      let parts = key.split(#char ':').toArray();
      if (parts.size() == 2) {
        switch (Nat.fromText(parts[1])) {
          case (?entryId) { (entryId, rating) };
          case (null) { (0, rating) };
        };
      } else { (0, rating) };
    });
  };

  // ============================================================
  // COMMUNITY UPVOTES
  // ============================================================

  public shared ({ caller }) func upvoteEntry(entryId : Nat) : async Bool {
    requireAuthenticated(caller);
    let key = caller.toText() # ":" # entryId.toText();
    switch (upvotes.get(key)) {
      case (?_) {
        // Toggle off
        upvotes.remove(key);
        false;
      };
      case (null) {
        upvotes.add(key, Time.now());
        true;
      };
    };
  };

  public query ({ caller }) func getEntryUpvotes(entryId : Nat) : async Nat {
    let suffix = ":" # entryId.toText();
    upvotes.keys().filter(func(k) {
      let parts = k.split(#char ':').toArray();
      parts.size() == 2 and parts[1] == entryId.toText();
    }).toArray().size();
  };

  public query ({ caller }) func hasCallerUpvoted(entryId : Nat) : async Bool {
    if (caller.isAnonymous()) { return false };
    upvotes.containsKey(caller.toText() # ":" # entryId.toText());
  };

  public query ({ caller }) func getTopUpvotedEntries(limit : Nat) : async [(Nat, Nat)] {
    // Tally upvotes per entryId
    let tally = Map.empty<Nat, Nat>();
    for (key in upvotes.keys()) {
      let parts = key.split(#char ':').toArray();
      if (parts.size() == 2) {
        switch (Nat.fromText(parts[1])) {
          case (?entryId) {
            let current = switch (tally.get(entryId)) { case (?n) n; case (null) 0 };
            tally.add(entryId, current + 1);
          };
          case (null) {};
        };
      };
    };
    let sorted = tally.toArray().sort(func((_, a), (_, b)) {
      if (a > b) #less else if (a < b) #greater else #equal
    });
    sorted.sliceToArray(0, Nat.min(limit, sorted.size()));
  };

  public query ({ caller }) func getCommunitySpotlight() : async ?Nat {
    // Returns the entry with the most upvotes overall
    let tally = Map.empty<Nat, Nat>();
    for (key in upvotes.keys()) {
      let parts = key.split(#char ':').toArray();
      if (parts.size() == 2) {
        switch (Nat.fromText(parts[1])) {
          case (?entryId) {
            let current = switch (tally.get(entryId)) { case (?n) n; case (null) 0 };
            tally.add(entryId, current + 1);
          };
          case (null) {};
        };
      };
    };
    if (tally.size() == 0) { return null };
    var bestId = 0;
    var bestCount = 0;
    for ((id, count) in tally.entries()) {
      if (count > bestCount) { bestId := id; bestCount := count };
    };
    if (bestCount == 0) { null } else { ?bestId };
  };

  // ============================================================
  // COMMUNITY COMMENTS
  // ============================================================

  public shared ({ caller }) func addComment(entryId : Nat, text : Text) : async Nat {
    requireAuthenticated(caller);
    ensureProfileExists(caller);
    let authorName = switch (profiles_v2.get(caller)) {
      case (?p) { if (Text.equal(p.displayName, "")) "Anon" else p.displayName };
      case (null) { "Anon" };
    };
    let commentId = nextCommentId;
    comments.add(commentId, {
      id = commentId;
      entryId;
      author = caller;
      authorName;
      text;
      createdAt = Time.now();
      parentId = null;
      flagCount = 0;
      deleted = false;
    });
    nextCommentId += 1;
    commentId;
  };

  public shared ({ caller }) func replyToComment(parentCommentId : Nat, text : Text) : async Nat {
    requireAuthenticated(caller);
    ensureProfileExists(caller);
    let parent = switch (comments.get(parentCommentId)) {
      case (null) { Runtime.trap("Parent comment not found") };
      case (?c) { c };
    };
    let authorName = switch (profiles_v2.get(caller)) {
      case (?p) { if (Text.equal(p.displayName, "")) "Anon" else p.displayName };
      case (null) { "Anon" };
    };
    let commentId = nextCommentId;
    comments.add(commentId, {
      id = commentId;
      entryId = parent.entryId;
      author = caller;
      authorName;
      text;
      createdAt = Time.now();
      parentId = ?parentCommentId;
      flagCount = 0;
      deleted = false;
    });
    nextCommentId += 1;
    commentId;
  };

  public query ({ caller }) func getComments(entryId : Nat) : async [CommunityComment] {
    comments.values().filter(func(c) {
      c.entryId == entryId and not c.deleted
    }).toArray();
  };

  public query ({ caller }) func getFlaggedComments(secret : Text) : async [CommunityComment] {
    requireAdminSecret(secret);
    comments.values().filter(func(c) { c.flagCount > 0 and not c.deleted }).toArray();
  };

  public shared ({ caller }) func flagComment(commentId : Nat) : async () {
    requireAuthenticated(caller);
    let flagKey = caller.toText() # ":" # commentId.toText();
    if (commentFlags.containsKey(flagKey)) { Runtime.trap("Already flagged") };
    switch (comments.get(commentId)) {
      case (null) { Runtime.trap("Comment not found") };
      case (?c) {
        commentFlags.add(flagKey, true);
        comments.add(commentId, { c with flagCount = c.flagCount + 1 });
      };
    };
  };

  public shared ({ caller }) func deleteCommentWithSecret(secret : Text, commentId : Nat) : async () {
    requireAdminSecretAndRole(caller, secret);
    switch (comments.get(commentId)) {
      case (null) { Runtime.trap("Comment not found") };
      case (?c) {
        comments.add(commentId, { c with deleted = true });
      };
    };
  };

  // ============================================================
  // EMAIL SUBSCRIPTION
  // ============================================================

  public shared ({ caller = _ }) func subscribeEmail(email : Text, oisyPrincipal : Text, source : Text) : async () {
    subscribers_v2.add(email, {
      email; oisyPrincipal; principalId = null; subscribedAt = Time.now(); source;
    });
  };

  public shared ({ caller }) func linkEmailToPrincipal(email : Text) : async () {
    requireAuthenticated(caller);
    switch (subscribers_v2.get(email)) {
      case (null) { Runtime.trap("Email not found") };
      case (?sub) {
        subscribers_v2.add(email, { sub with principalId = ?caller.toText() });
      };
    };
  };

  public shared ({ caller }) func getAllSubscribersWithSecret(secret : Text) : async [EmailSubscriber] {
    requireAdminSecretAndRole(caller, secret);
    subscribers_v2.values().toArray();
  };

  public query ({ caller = _ }) func getSubscriberCount() : async Nat {
    subscribers_v2.size();
  };

  // ============================================================
  // BONSAI APPROVED / AIRDROP
  // ============================================================

  public shared ({ caller }) func markBonsaiApprovedWithSecret(secret : Text, principalId : Text, oisyPrincipal : Text, email : Text) : async () {
    requireAdminSecretAndRole(caller, secret);
    bonsaiApprovedList.add(principalId, { principalId; oisyPrincipal; email; approvedAt = Time.now() });
  };

  public shared ({ caller }) func getBonsaiApprovedListWithSecret(secret : Text) : async [BonsaiApprovedEntry] {
    requireAdminSecretAndRole(caller, secret);
    bonsaiApprovedList.values().toArray();
  };

  public query ({ caller = _ }) func isBonsaiApproved(principalId : Text) : async Bool {
    bonsaiApprovedList.containsKey(principalId);
  };

  // ============================================================
  // AMBASSADOR PROGRAM
  // ============================================================

  public shared ({ caller }) func registerAmbassador(profile : AmbassadorProfile) : async () {
    requireAuthenticated(caller);
    ambassadorProfiles.add(caller.toText(), {
      profile with
      principalId = caller.toText();
      joinedAt = Time.now();
      status = #pending;
      agreedToPlatformTerms = true;
    });
  };

  public query ({ caller = _ }) func getAmbassadorProfile(principalId : Text) : async ?AmbassadorProfile {
    ambassadorProfiles.get(principalId);
  };

  public shared ({ caller }) func saveAmbassadorProfile(profile : AmbassadorProfile) : async () {
    requireAuthenticated(caller);
    let status = switch (ambassadorProfiles.get(caller.toText())) {
      case (?p) { p.status }; case (null) { #pending };
    };
    ambassadorProfiles.add(caller.toText(), {
      profile with principalId = caller.toText(); status; agreedToPlatformTerms = true;
    });
  };

  public query ({ caller = _ }) func getAllAmbassadors() : async [AmbassadorProfile] {
    ambassadorProfiles.values().toArray();
  };

  public query ({ caller = _ }) func getApprovedAmbassadors() : async [AmbassadorProfile] {
    ambassadorProfiles.values().filter(func(p) { p.status == #approved }).toArray();
  };

  public shared ({ caller }) func approveAmbassadorWithSecret(secret : Text, principalId : Text) : async () {
    requireAdminSecretAndRole(caller, secret);
    switch (ambassadorProfiles.get(principalId)) {
      case (null) { Runtime.trap("Ambassador not found") };
      case (?p) { ambassadorProfiles.add(principalId, { p with status = #approved }) };
    };
  };

  public shared ({ caller }) func suspendAmbassadorWithSecret(secret : Text, principalId : Text) : async () {
    requireAdminSecretAndRole(caller, secret);
    switch (ambassadorProfiles.get(principalId)) {
      case (null) { Runtime.trap("Ambassador not found") };
      case (?p) { ambassadorProfiles.add(principalId, { p with status = #suspended }) };
    };
  };

  // ============================================================
  // CREATOR CONTRACTS
  // ============================================================

  public shared ({ caller }) func createContract(
    influencerPrincipal : Text, campaignTitle : Text,
    description : Text, deliverables : Text, priceInCkUSDC : Float
  ) : async Text {
    requireAuthenticated(caller);
    let influencerTermsSnapshot = switch (ambassadorProfiles.get(influencerPrincipal)) {
      case (?p) { p.customTerms }; case (null) { "" };
    };
    let contractId = "contract-" # nextContractId.toText();
    creatorContracts.add(contractId, {
      id = contractId;
      influencerPrincipal;
      clientPrincipal = caller.toText();
      campaignTitle; description; deliverables; priceInCkUSDC;
      influencerTermsSnapshot;
      clientAgreedAt = null;
      status = #pending_agreement;
      createdAt = Time.now();
      completedAt = null;
      disputeReason = "";
      daoVotes = [];
      resolvedBy = "";
    });
    nextContractId += 1;
    contractId;
  };

  public shared ({ caller }) func clientAgreeToTerms(contractId : Text) : async () {
    requireAuthenticated(caller);
    switch (creatorContracts.get(contractId)) {
      case (null) { Runtime.trap("Contract not found") };
      case (?c) {
        if (not Text.equal(c.clientPrincipal, caller.toText())) {
          Runtime.trap("Only the client can agree to terms");
        };
        creatorContracts.add(contractId, { c with clientAgreedAt = ?Time.now(); status = #active });
      };
    };
  };

  public shared ({ caller }) func markContractComplete(contractId : Text) : async () {
    requireAuthenticated(caller);
    switch (creatorContracts.get(contractId)) {
      case (null) { Runtime.trap("Contract not found") };
      case (?c) {
        if (not Text.equal(c.influencerPrincipal, caller.toText())) {
          Runtime.trap("Only the influencer can mark complete");
        };
        creatorContracts.add(contractId, { c with completedAt = ?Time.now(); status = #completed });
      };
    };
  };

  public shared ({ caller }) func disputeContract(contractId : Text, reason : Text) : async () {
    requireAuthenticated(caller);
    switch (creatorContracts.get(contractId)) {
      case (null) { Runtime.trap("Contract not found") };
      case (?c) {
        let isParty = Text.equal(c.influencerPrincipal, caller.toText()) or Text.equal(c.clientPrincipal, caller.toText());
        if (not isParty) { Runtime.trap("Only contract parties can dispute") };
        creatorContracts.add(contractId, { c with disputeReason = reason; status = #disputed });
      };
    };
  };

  public shared ({ caller }) func voteOnContract(contractId : Text, vote : DAOVoteChoice, comment : Text) : async () {
    requireAuthenticated(caller);
    switch (creatorContracts.get(contractId)) {
      case (null) { Runtime.trap("Contract not found") };
      case (?c) {
        if (c.status != #disputed) { Runtime.trap("Contract is not in disputed state") };
        if (c.daoVotes.any(func(v) { Text.equal(v.voter, caller.toText()) })) {
          Runtime.trap("Already voted on this contract");
        };
        let newVote : DAOVote = {
          voter = caller.toText(); contractId; vote; comment; timestamp = Time.now();
        };
        creatorContracts.add(contractId, { c with daoVotes = c.daoVotes.concat([newVote]) });
      };
    };
  };

  public shared ({ caller }) func resolveContractWithSecret(secret : Text, contractId : Text, resolution : Text) : async () {
    requireAdminSecretAndRole(caller, secret);
    switch (creatorContracts.get(contractId)) {
      case (null) { Runtime.trap("Contract not found") };
      case (?c) {
        creatorContracts.add(contractId, { c with status = #resolved; resolvedBy = resolution });
      };
    };
  };

  public query ({ caller = _ }) func getContract(contractId : Text) : async ?CreatorContract {
    creatorContracts.get(contractId);
  };

  public query ({ caller = _ }) func getContractsByAmbassador(principalId : Text) : async [CreatorContract] {
    creatorContracts.values().filter(func(c) { Text.equal(c.influencerPrincipal, principalId) }).toArray();
  };

  public query ({ caller = _ }) func getContractsByClient(principalId : Text) : async [CreatorContract] {
    creatorContracts.values().filter(func(c) { Text.equal(c.clientPrincipal, principalId) }).toArray();
  };

  public query ({ caller = _ }) func getAllPublicContracts() : async [CreatorContract] {
    creatorContracts.values().toArray();
  };

  public query ({ caller = _ }) func getDisputedContracts() : async [CreatorContract] {
    creatorContracts.values().filter(func(c) { c.status == #disputed }).toArray();
  };

  // ============================================================
  // BANNER ADS
  // ============================================================

  public shared ({ caller }) func saveBannerAdsWithSecret(secret : Text, adsJson : Text) : async () {
    requireAdminSecretAndRole(caller, secret);
    bannerAdsJson := adsJson;
  };

  public query ({ caller = _ }) func getBannerAdsJson() : async Text {
    bannerAdsJson;
  };

  // ============================================================
  // ECOSYSTEM ORDER
  // ============================================================

  public shared ({ caller }) func saveEcosystemOrderWithSecret(secret : Text, orderJson : Text) : async () {
    requireAdminSecretAndRole(caller, secret);
    ecosystemOrderJson := orderJson;
  };

  public query ({ caller = _ }) func getEcosystemOrder() : async Text {
    ecosystemOrderJson;
};
};
