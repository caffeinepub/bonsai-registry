import Map "mo:core/Map";
import Set "mo:core/Set";
import Text "mo:core/Text";
import List "mo:core/List";
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

  module BonsaiRegistryEntry {
    public func compare(entry1 : BonsaiRegistryEntry, entry2 : BonsaiRegistryEntry) : Order.Order {
      Nat.compare(entry1.id, entry2.id);
    };
  };

  let bonsaiRegistryEntries = Map.empty<Nat, BonsaiRegistryEntry>();
  var nextId = 1;

  // Core authorization system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User profiles storage
  let userProfiles = Map.empty<Principal, UserProfile>();

  // User profile management functions
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

  // Helper function to filter entries by ecosystem
  func filterByEcosystem(entry : BonsaiRegistryEntry, ecosystem : Text) : Bool {
    Text.equal(entry.ecosystem, ecosystem);
  };

  // Helper function to filter by category
  func filterByCategory(entry : BonsaiRegistryEntry, category : Category) : Bool {
    let entryCategories = entry.categories;
    switch (entryCategories.find(func(c) { c == category })) {
      case (?_) { true };
      case (null) { false };
    };
  };

  // Public query: Get all entries
  public query func getAllRegistryEntries(offset : Nat, limit : Nat) : async [BonsaiRegistryEntry] {
    bonsaiRegistryEntries.values().toArray().sliceToArray(offset, Nat.min(offset + limit, bonsaiRegistryEntries.size()));
  };

  // Public query: Get entries by ecosystem
  public query func getEntriesByEcosystem(ecosystem : Text, offset : Nat, limit : Nat) : async [BonsaiRegistryEntry] {
    let filteredEntries = bonsaiRegistryEntries.values().toArray().filter(
      func(entry) { filterByEcosystem(entry, ecosystem) }
    );
    filteredEntries.sliceToArray(offset, Nat.min(offset + limit, filteredEntries.size()));
  };

  // Public query: Get entries by category
  public query func getEntriesByCategory(category : Category, offset : Nat, limit : Nat) : async [BonsaiRegistryEntry] {
    let filteredEntries = bonsaiRegistryEntries.values().toArray().filter(
      func(entry) { filterByCategory(entry, category) }
    );
    filteredEntries.sliceToArray(offset, Nat.min(offset + limit, filteredEntries.size()));
  };

  // FIXME Full-text search with search index in follow-up PR
  public query func fullTextSearch(_ : Text, _ : Nat, _ : Nat) : async [BonsaiRegistryEntry] {
    Runtime.trap("Full-text search not yet implemented. Please filter by ecosystem, category, or use pagination for now.");
  };

  // Admin-only: Add registry entry
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

  // Admin-only: Update registry entry
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

  // Admin-only: Remove registry entry
  public shared ({ caller }) func removeRegistryEntry(id : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can remove entries");
    };
    bonsaiRegistryEntries.remove(id);
  };

  // Admin-only: Bulk import entries
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

  // Public query: Get total entry count
  public query func getTotalEntriesCount() : async Nat {
    bonsaiRegistryEntries.size();
  };
};
