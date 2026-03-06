import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Float "mo:core/Float";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Set "mo:core/Set";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  public type Category = {
    #gaming;
    #defi;
    #nft;
    #wallet;
    #exchange;
    #social;
    #tools;
    #commerce;
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

  public type ExtendedUserProfile = {
    username : Text;
    displayName : Text;
    bio : Text;
    bannerUrl : ?Text;
    avatarUrl : ?Text;
    socialLinks : SocialLinks;
    walletAddresses : WalletAddresses;
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

  // Private mutable user profile for internal use
  type PrivateUserProfile = {
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

  let ADMIN_SECRET : Text = "#WakeUp4";

  let bonsaiRegistryEntries = Map.empty<Nat, BonsaiRegistryEntry>();
  var nextId = 1;
  let ratings = Map.empty<Text, Nat>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let userProfiles = Map.empty<Principal, PrivateUserProfile>();
  let pendingSubmissions = Map.empty<Nat, PendingSubmission>();
  var listingFeeE8s = 100_000_000 : Nat;

  // Helper functions
  func requireAdminSecret(secret : Text) {
    if (not Text.equal(secret, ADMIN_SECRET)) {
      Runtime.trap("Unauthorized: Invalid admin secret");
    };
  };

  func requireAdminSecretAndRole(caller : Principal, secret : Text) {
    requireAdminSecret(secret);
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
  };

  // Auto-register helper: ensures authenticated users are registered as #user
  func ensureUserRegistered(caller : Principal) {
    if (caller.isAnonymous()) {
      return;
    };
    // Try to get the user role; if it traps, the user is not registered
    // We catch this by using a try-catch pattern via checking if assignRole works
    // Since we can't directly catch traps, we use assignRole which is idempotent
    // and will register the user if they don't exist
    ignore do ? {
      // Attempt to assign the user role to themselves
      // This will only work if they're already registered or we register them
      AccessControl.assignRole(accessControlState, caller, caller, #user);
    };
  };

  // Conversion functions
  func toExtendedUserProfile(privateProfile : PrivateUserProfile) : ExtendedUserProfile {
    {
      username = privateProfile.username;
      displayName = privateProfile.displayName;
      bio = privateProfile.bio;
      bannerUrl = privateProfile.bannerUrl;
      avatarUrl = privateProfile.avatarUrl;
      socialLinks = privateProfile.socialLinks;
      walletAddresses = privateProfile.walletAddresses;
      joinedAt = privateProfile.joinedAt;
      pinnedNfts = privateProfile.pinnedNfts;
      bookmarks = privateProfile.bookmarks.toArray();
      ratedEntries = privateProfile.ratedEntries;
      submittedEntries = privateProfile.submittedEntries;
      badges = privateProfile.badges;
    };
  };

  func fromExtendedUserProfile(profile : ExtendedUserProfile) : PrivateUserProfile {
    let bookmarksSet = Set.empty<Nat>();
    for (bookmark in profile.bookmarks.values()) {
      bookmarksSet.add(bookmark);
    };

    {
      username = profile.username;
      displayName = profile.displayName;
      bio = profile.bio;
      bannerUrl = profile.bannerUrl;
      avatarUrl = profile.avatarUrl;
      socialLinks = profile.socialLinks;
      walletAddresses = profile.walletAddresses;
      joinedAt = profile.joinedAt;
      pinnedNfts = profile.pinnedNfts;
      bookmarks = bookmarksSet;
      ratedEntries = profile.ratedEntries;
      submittedEntries = profile.submittedEntries;
      badges = profile.badges;
    };
  };

  // User profile functions
  public query ({ caller }) func getCallerUserProfile() : async ?ExtendedUserProfile {
    if (caller.isAnonymous()) { return null };
    switch (userProfiles.get(caller)) {
      case (null) { null };
      case (?profile) { ?toExtendedUserProfile(profile) };
    };
  };

  public query ({ caller }) func getPublicUserProfile(user : Principal) : async ?ExtendedUserProfile {
    switch (userProfiles.get(user)) {
      case (null) { null };
      case (?profile) { ?toExtendedUserProfile(profile) };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : ExtendedUserProfile) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    let privateProfile = fromExtendedUserProfile(profile);
    userProfiles.add(caller, privateProfile);
  };

  public shared ({ caller }) func bookmarkEntry(entryId : Nat) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can bookmark entries");
    };

    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Profile not found") };
      case (?profile) {
        if (profile.bookmarks.contains(entryId)) {
          Runtime.trap("Entry already bookmarked");
        };
        profile.bookmarks.add(entryId);
        userProfiles.add(caller, profile);
      };
    };
  };

  public shared ({ caller }) func unbookmarkEntry(entryId : Nat) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unbookmark entries");
    };

    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Profile not found") };
      case (?profile) {
        if (not profile.bookmarks.contains(entryId)) {
          Runtime.trap("Bookmark does not exist");
        };
        profile.bookmarks.remove(entryId);
        userProfiles.add(caller, profile);
      };
    };
  };

  public query ({ caller }) func getAllBookmarkedEntries() : async [Nat] {
    if (caller.isAnonymous()) { return [] };
    switch (userProfiles.get(caller)) {
      case (null) { [] };
      case (?profile) { profile.bookmarks.toArray() };
    };
  };

  public query ({ caller }) func getListingFee() : async Nat {
    listingFeeE8s;
  };

  public shared ({ caller }) func setListingFeeWithSecret(secret : Text, fee : Nat) : async () {
    requireAdminSecretAndRole(caller, secret);
    listingFeeE8s := fee;
  };

  public shared ({ caller }) func submitProjectListing(entry : BonsaiRegistryEntry, paymentMemo : Text) : async Nat {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit projects");
    };

    let submissionId = nextId;
    let submission : PendingSubmission = {
      id = submissionId;
      submitter = caller;
      entry;
      paymentMemo;
      submittedAt = Time.now();
      status = #pending;
    };

    pendingSubmissions.add(submissionId, submission);
    nextId += 1;

    switch (userProfiles.get(caller)) {
      case (null) {
        let defaultSocialLinks = {
          twitter = null;
          github = null;
          discord = null;
          telegram = null;
          website = null;
        };
        let defaultWalletAddresses = {
          eth = null;
          btc = null;
          hbar = null;
          sol = null;
        };

        let newProfile : PrivateUserProfile = {
          username = "";
          displayName = "New User";
          bio = "";
          bannerUrl = null;
          avatarUrl = null;
          socialLinks = defaultSocialLinks;
          walletAddresses = defaultWalletAddresses;
          joinedAt = Time.now();
          pinnedNfts = [];
          bookmarks = Set.empty<Nat>();
          ratedEntries = [];
          submittedEntries = [submissionId];
          badges = [];
        };
        userProfiles.add(caller, newProfile);
      };
      case (?profile) {
        let updatedSubmittedEntries = profile.submittedEntries.concat([submissionId]);
        let updatedProfile = {
          profile with submittedEntries = updatedSubmittedEntries
        };
        userProfiles.add(caller, updatedProfile);
      };
    };
    submissionId;
  };

  public query ({ caller }) func getPendingSubmissions(secret : Text) : async [PendingSubmission] {
    requireAdminSecret(secret);
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view pending submissions");
    };
    pendingSubmissions.values().toArray();
  };

  public shared ({ caller }) func approvePendingSubmissionWithSecret(secret : Text, submissionId : Nat) : async () {
    requireAdminSecretAndRole(caller, secret);
    switch (pendingSubmissions.get(submissionId)) {
      case (null) { Runtime.trap("Submission not found") };
      case (?submission) {
        let newEntry = { submission.entry with id = nextId; createdAt = Time.now() };
        bonsaiRegistryEntries.add(nextId, newEntry);
        nextId += 1;

        let updatedSubmission = { submission with status = #approved };
        pendingSubmissions.add(submissionId, updatedSubmission);
      };
    };
  };

  public shared ({ caller }) func rejectPendingSubmissionWithSecret(secret : Text, submissionId : Nat) : async () {
    requireAdminSecretAndRole(caller, secret);
    switch (pendingSubmissions.get(submissionId)) {
      case (null) { Runtime.trap("Submission not found") };
      case (?submission) {
        let updatedSubmission = { submission with status = #rejected };
        pendingSubmissions.add(submissionId, updatedSubmission);
      };
    };
  };

  public query ({ caller }) func getAllRegistryEntries(offset : Nat, limit : Nat) : async [BonsaiRegistryEntry] {
    let allEntries = bonsaiRegistryEntries.values().toArray();
    allEntries.sliceToArray(offset, Nat.min(offset + limit, allEntries.size()));
  };

  public query ({ caller }) func getEntriesByEcosystem(ecosystem : Text, offset : Nat, limit : Nat) : async [BonsaiRegistryEntry] {
    let filteredEntries = bonsaiRegistryEntries.values().toArray().filter(
      func(entry) { Text.equal(entry.ecosystem, ecosystem) }
    );
    filteredEntries.sliceToArray(offset, Nat.min(offset + limit, filteredEntries.size()));
  };

  public query ({ caller }) func getEntriesByCategory(category : Category, offset : Nat, limit : Nat) : async [BonsaiRegistryEntry] {
    let filteredEntries = bonsaiRegistryEntries.values().toArray().filter(
      func(entry) {
        entry.categories.any(
          func(c) { c == category }
        );
      }
    );
    filteredEntries.sliceToArray(offset, Nat.min(offset + limit, filteredEntries.size()));
  };

  public query ({ caller }) func fullTextSearch(_ : Text, _ : Nat, _ : Nat) : async [BonsaiRegistryEntry] {
    Runtime.trap("Full-text search not yet implemented. Please filter by ecosystem, category, or use pagination for now.");
  };

  public shared ({ caller }) func addRegistryEntry(entry : BonsaiRegistryEntry) : async Nat {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can add entries");
    };
    let entryId = nextId;
    let newEntry = {
      entry with
      id = entryId;
      createdAt = Time.now();
    };
    bonsaiRegistryEntries.add(entryId, newEntry);
    nextId += 1;
    entryId;
  };

  public shared ({ caller }) func updateRegistryEntry(id : Nat, newEntry : BonsaiRegistryEntry) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can update entries");
    };
    switch (bonsaiRegistryEntries.get(id)) {
      case (null) { Runtime.trap("Entry not found") };
      case (?existing) {
        bonsaiRegistryEntries.add(
          id,
          newEntry,
        );
      };
    };
  };

  public shared ({ caller }) func removeRegistryEntry(id : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can remove entries");
    };
    bonsaiRegistryEntries.remove(id);
  };

  public shared ({ caller }) func bulkImportEntries(entries : [BonsaiRegistryEntry]) : async [Nat] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can import entries");
    };
    let idList = List.empty<Nat>();
    for (entry in entries.values()) {
      let entryId = nextId;
      let newEntry = {
        entry with
        id = entryId;
        createdAt = Time.now();
      };
      bonsaiRegistryEntries.add(entryId, newEntry);
      idList.add(entryId);
      nextId += 1;
    };
    idList.toArray();
  };

  public query ({ caller }) func getTotalEntriesCount() : async Nat {
    bonsaiRegistryEntries.size();
  };

  public shared ({ caller }) func addRegistryEntryWithSecret(secret : Text, entry : BonsaiRegistryEntry) : async Nat {
    requireAdminSecretAndRole(caller, secret);
    let entryId = nextId;
    let newEntry = {
      entry with
      id = entryId;
      createdAt = Time.now();
    };
    bonsaiRegistryEntries.add(entryId, newEntry);
    nextId += 1;
    entryId;
  };

  public shared ({ caller }) func updateRegistryEntryWithSecret(secret : Text, id : Nat, newEntry : BonsaiRegistryEntry) : async () {
    requireAdminSecretAndRole(caller, secret);
    switch (bonsaiRegistryEntries.get(id)) {
      case (null) { Runtime.trap("Entry not found") };
      case (?existing) {
        bonsaiRegistryEntries.add(
          id,
          newEntry,
        );
      };
    };
  };

  public shared ({ caller }) func removeRegistryEntryWithSecret(secret : Text, id : Nat) : async () {
    requireAdminSecretAndRole(caller, secret);
    bonsaiRegistryEntries.remove(id);
  };

  public shared ({ caller }) func bulkImportEntriesWithSecret(secret : Text, entries : [BonsaiRegistryEntry]) : async [Nat] {
    requireAdminSecretAndRole(caller, secret);
    let idList = List.empty<Nat>();

    for (entry in entries.values()) {
      // Normalize (trim) the new entry's URL
      let normalizedUrl = entry.url.trim(#char ' ');

      // Check for duplicate URL
      let isDuplicate = bonsaiRegistryEntries.values().any(
        func(existingEntry) {
          let existingUrl = existingEntry.url.trim(#char ' ');
          Text.equal(normalizedUrl, existingUrl);
        }
      );

      if (not isDuplicate) {
        let entryId = nextId;
        let newEntry = {
          entry with
          id = entryId;
          createdAt = Time.now();
        };
        bonsaiRegistryEntries.add(entryId, newEntry);
        idList.add(entryId);
        nextId += 1;
      };
    };

    idList.toArray();
  };

  public shared ({ caller }) func rateEntry(entryId : Nat, rating : Nat) : async () {
    ensureUserRegistered(caller);
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can rate entries");
    };

    if (rating < 1 or rating > 5) {
      Runtime.trap("Invalid rating value: Must be between 1 and 5");
    };

    if (not bonsaiRegistryEntries.containsKey(entryId)) {
      Runtime.trap("Entry not found");
    };

    let compositeKey = caller.toText() # ":" # entryId.toText();
    ratings.add(compositeKey, rating);
  };

  func calculateEntryRating(entryId : Nat) : EntryRatingStats {
    var sum = 0;
    var count = 0;

    let matchingRatings = ratings.entries().filter(
      func((key, _)) {
        let parts = key.split(#char ':').toArray();
        parts.size() == 2 and parts[1] == entryId.toText();
      }
    );

    matchingRatings.forEach(
      func((_key, rating)) {
        sum += rating;
        count += 1;
      }
    );

    if (count == 0) {
      {
        average = 0.0;
        count = 0;
      };
    } else {
      {
        average = (sum.toFloat()) / (count.toFloat());
        count;
      };
    };
  };

  public query ({ caller }) func getEntryRating(entryId : Nat) : async EntryRatingStats {
    calculateEntryRating(entryId);
  };

  public query ({ caller }) func getAllEntryRatings() : async [(Nat, EntryRatingStats)] {
    let entries = bonsaiRegistryEntries.values().toArray();
    entries.map(
      func(entry) {
        (entry.id, calculateEntryRating(entry.id));
      }
    );
  };

  public query ({ caller }) func getCallerRating(entryId : Nat) : async ?Nat {
    if (caller.isAnonymous()) {
      return null;
    };
    let compositeKey = caller.toText() # ":" # entryId.toText();
    ratings.get(compositeKey);
  };

  public query ({ caller }) func getCallerAllRatings() : async [(Nat, Nat)] {
    if (caller.isAnonymous()) {
      return [];
    };

    let callerRatings = ratings.toArray().filter(
      func((key, _)) {
        let parts = key.split(#char ':').toArray();
        parts.size() == 2 and parts[0] == caller.toText();
      }
    );

    callerRatings.map(
      func((key, rating)) {
        let parts = key.split(#char ':').toArray();
        if (parts.size() == 2) {
          switch (Nat.fromText(parts[1])) {
            case (?entryId) {
              (entryId, rating);
            };
            case (null) {
              (0, rating);
            };
          };
        } else {
          (0, rating);
        };
      }
    );
  };
};
