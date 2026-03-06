import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Float "mo:core/Float";
import Time "mo:core/Time";

module {
  type Category = { #gaming; #defi; #nft; #wallet; #exchange; #social; #tools; #commerce };
  type BonsaiRegistryEntry = {
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

  // Old (deprecated) user profile type
  type OldUserProfile = {
    name : Text;
  };

  // New user profile type as per new requirements
  type ExtendedUserProfile = {
    displayName : Text;
    bio : Text;
    avatarUrl : ?Text;
    walletPrincipal : ?Principal;
    pinnedNfts : [{ collectionId : Text; tokenId : Nat }];
    submittedEntries : [Nat];
  };

  type EntryRatingStats = {
    average : Float;
    count : Nat;
  };

  type PendingSubmission = {
    id : Nat;
    submitter : Principal;
    entry : BonsaiRegistryEntry;
    paymentMemo : Text;
    submittedAt : Time.Time;
    status : { #pending; #approved; #rejected };
  };

  type OldActor = {
    bonsaiRegistryEntries : Map.Map<Nat, BonsaiRegistryEntry>;
    nextId : Nat;
    ratings : Map.Map<Text, Nat>;
    userProfiles : Map.Map<Principal, OldUserProfile>;
  };

  type NewActor = {
    bonsaiRegistryEntries : Map.Map<Nat, BonsaiRegistryEntry>;
    nextId : Nat;
    ratings : Map.Map<Text, Nat>;
    userProfiles : Map.Map<Principal, ExtendedUserProfile>;
    pendingSubmissions : Map.Map<Nat, PendingSubmission>;
    listingFeeE8s : Nat;
  };

  // Migration function to transform old state to new state
  public func run(old : OldActor) : NewActor {
    let newUserProfiles = old.userProfiles.map<Principal, OldUserProfile, ExtendedUserProfile>(
      func(_principal, oldProfile) {
        {
          displayName = oldProfile.name;
          bio = "";
          avatarUrl = null;
          walletPrincipal = null;
          pinnedNfts = [];
          submittedEntries = [];
        };
      }
    );

    {
      old with
      userProfiles = newUserProfiles;
      pendingSubmissions = Map.empty<Nat, PendingSubmission>(); // No existing pending submissions in old data
      listingFeeE8s = 100_000_000 : Nat;
    };
  };
};
