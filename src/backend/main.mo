import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Order "mo:core/Order";
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

  public type UserProfile = {
    name : Text;
  };

  let bonsaiRegistryEntries = Map.empty<Nat, BonsaiRegistryEntry>();
  var nextId = 1;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let userProfiles = Map.empty<Principal, UserProfile>();

  let ADMIN_SECRET : Text = "#WakeUp4";

  // Helper to verify admin secret
  func requireAdminSecret(secret : Text) {
    if (not Text.equal(secret, ADMIN_SECRET)) {
      Runtime.trap("Unauthorized: Invalid admin secret");
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Query functions (no auth needed)
  func filterByEcosystem(entry : BonsaiRegistryEntry, ecosystem : Text) : Bool {
    Text.equal(entry.ecosystem, ecosystem);
  };

  func filterByCategory(entry : BonsaiRegistryEntry, category : Category) : Bool {
    let entryCategories = entry.categories;
    switch (entryCategories.find(func(c) { c == category })) {
      case (?_) { true };
      case (null) { false };
    };
  };

  public query func getAllRegistryEntries(offset : Nat, limit : Nat) : async [BonsaiRegistryEntry] {
    let allEntries = bonsaiRegistryEntries.values().toArray();
    allEntries.sliceToArray(offset, Nat.min(offset + limit, allEntries.size()));
  };

  public query func getEntriesByEcosystem(ecosystem : Text, offset : Nat, limit : Nat) : async [BonsaiRegistryEntry] {
    let filteredEntries = bonsaiRegistryEntries.values().toArray().filter(
      func(entry) { filterByEcosystem(entry, ecosystem) }
    );
    filteredEntries.sliceToArray(offset, Nat.min(offset + limit, filteredEntries.size()));
  };

  public query func getEntriesByCategory(category : Category, offset : Nat, limit : Nat) : async [BonsaiRegistryEntry] {
    let filteredEntries = bonsaiRegistryEntries.values().toArray().filter(
      func(entry) { filterByCategory(entry, category) }
    );
    filteredEntries.sliceToArray(offset, Nat.min(offset + limit, filteredEntries.size()));
  };

  public query func fullTextSearch(_ : Text, _ : Nat, _ : Nat) : async [BonsaiRegistryEntry] {
    Runtime.trap("Full-text search not yet implemented. Please filter by ecosystem, category, or use pagination for now.");
  };

  // Admin shared functions (principal-based access)
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

  public query func getTotalEntriesCount() : async Nat {
    bonsaiRegistryEntries.size();
  };

  // Secret-based admin functions
  public shared ({ caller }) func addRegistryEntryWithSecret(secret : Text, entry : BonsaiRegistryEntry) : async Nat {
    requireAdminSecret(secret);
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
    requireAdminSecret(secret);
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
    requireAdminSecret(secret);
    bonsaiRegistryEntries.remove(id);
  };

  public shared ({ caller }) func bulkImportEntriesWithSecret(secret : Text, entries : [BonsaiRegistryEntry]) : async [Nat] {
    requireAdminSecret(secret);
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
};
