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


import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


actor {
  public type Category =
    { #gaming; #defi; #nft; #wallet; #exchange; #social; #tools; #commerce };

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
    displayName : Text;
    bio : Text;
    avatarUrl : ?Text;
    walletPrincipal : ?Principal;
    pinnedNfts : [{ collectionId : Text; tokenId : Nat }];
    submittedEntries : [Nat];
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

  let ADMIN_SECRET : Text = "#WakeUp4";

  let bonsaiRegistryEntries = Map.empty<Nat, BonsaiRegistryEntry>();
  var nextId = 1;
  let ratings = Map.empty<Text, Nat>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let userProfiles = Map.empty<Principal, ExtendedUserProfile>();
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

  // User profile functions
  public query ({ caller }) func getCallerUserProfile() : async ?ExtendedUserProfile {
    // Allow all authenticated users to access their own profile
    userProfiles.get(caller);
  };

  public query ({ caller }) func getPublicUserProfile(user : Principal) : async ?ExtendedUserProfile {
    // Publicly readable, no auth check
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : ExtendedUserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(
      caller,
      profile,
    );
  };

  // Project listing functions
  public query ({ caller }) func getListingFee() : async Nat {
    // Publicly readable
    listingFeeE8s;
  };

  public shared ({ caller }) func setListingFeeWithSecret(secret : Text, fee : Nat) : async () {
    requireAdminSecretAndRole(caller, secret);
    listingFeeE8s := fee;
  };

  public shared ({ caller }) func submitProjectListing(entry : BonsaiRegistryEntry, paymentMemo : Text) : async Nat {
    // Check user permissions
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit projects");
    };

    // Create pending submission
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

    // Update user's submitted entries
    switch (userProfiles.get(caller)) {
      case (null) {
        // Create new profile if it doesn't exist
        let newProfile : ExtendedUserProfile = {
          displayName = "New User";
          bio = "";
          avatarUrl = null;
          walletPrincipal = null;
          pinnedNfts = [];
          submittedEntries = [submissionId];
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

  // Entry and rating functions (existing logic)
  public query ({ caller }) func getAllRegistryEntries(offset : Nat, limit : Nat) : async [BonsaiRegistryEntry] {
    // Publicly readable
    let allEntries = bonsaiRegistryEntries.values().toArray();
    allEntries.sliceToArray(offset, Nat.min(offset + limit, allEntries.size()));
  };

  public query ({ caller }) func getEntriesByEcosystem(ecosystem : Text, offset : Nat, limit : Nat) : async [BonsaiRegistryEntry] {
    // Publicly readable
    let filteredEntries = bonsaiRegistryEntries.values().toArray().filter(
      func(entry) { Text.equal(entry.ecosystem, ecosystem) }
    );
    filteredEntries.sliceToArray(offset, Nat.min(offset + limit, filteredEntries.size()));
  };

  public query ({ caller }) func getEntriesByCategory(category : Category, offset : Nat, limit : Nat) : async [BonsaiRegistryEntry] {
    // Publicly readable
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
    // Publicly readable (though not implemented)
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
    // Publicly readable
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

  // Rating-related functions
  public shared ({ caller }) func rateEntry(entryId : Nat, rating : Nat) : async () {
    // Only authenticated users with user permission can rate
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can rate entries");
    };

    // Ratings must be between 1 and 5
    if (rating < 1 or rating > 5) {
      Runtime.trap("Invalid rating value: Must be between 1 and 5");
    };

    // Check that entry exists
    if (not bonsaiRegistryEntries.containsKey(entryId)) {
      Runtime.trap("Entry not found");
    };

    // Create composite key
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
    // Publicly readable
    calculateEntryRating(entryId);
  };

  public query ({ caller }) func getAllEntryRatings() : async [(Nat, EntryRatingStats)] {
    // Publicly readable
    let entries = bonsaiRegistryEntries.values().toArray();
    entries.map(
      func(entry) {
        (entry.id, calculateEntryRating(entry.id));
      }
    );
  };

  public query ({ caller }) func getCallerRating(entryId : Nat) : async ?Nat {
    // If anonymous, always return null
    if (caller.isAnonymous()) {
      return null;
    };
    let compositeKey = caller.toText() # ":" # entryId.toText();
    ratings.get(compositeKey);
  };

  public query ({ caller }) func getCallerAllRatings() : async [(Nat, Nat)] {
    // If anonymous, always return empty array
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
