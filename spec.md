# Bonsai Registry — Version 66

## Current State
- EmailSignupWidget: email-only, optional II principal linking, no OISY principal
- EmailSubscriber type: email, principalId (?Text), subscribedAt, source
- Category variant: #gaming, #defi, #nft, #wallet, #exchange, #social, #tools, #commerce (no cloud_hosting)
- ExtendedUserProfile: no oisyPrincipal field persisted
- No ambassador/influencer system
- No creator commerce contracts
- No Bonsai Approved badge/airdrop mechanism
- No uBin registry entry or Cloud Hosting category

## Requested Changes (Diff)

### Add
- OISY wallet principal ID required field in mailing list signup (EmailSubscriber type updated to require oisyPrincipal: Text)
- EmailSignupWidget: OISY principal field (required), helper text, validation
- Bonsai Approved airdrop admin system: admin can mark wallets as approved, view/export airdrop list
- #cloud_hosting category to Category variant
- uBin entry in registry (ICP, Cloud Hosting, Tools)
- uBin hosting recommendation in UserProfilePage profile edit section
- Ambassador Program: new page at #ambassador
  - Influencer onboarding/registration with platform T&S (family-safe policy)
  - Customizable influencer profiles (bio, avatar, banner, social links, media showcase: MP4/GIF/PNG/JPEG)
  - Influencer sets their own price per campaign (ckUSDC)
  - Influencer writes custom T&S agreement for clients
  - Client must agree to influencer T&S before contract proceeds
  - All T&S agreements stored on-chain transparently
  - Contract workflow: created → client accepts T&S → active → completed or disputed
  - DAO vote on disputed contracts (community votes)
  - Contracts visible publicly for DAO transparency
  - Ambassador profiles amplified via Bonsai Registry ecosystem
  - Full media stack for ambassador profile showcase

### Modify
- Backend: EmailSubscriber adds oisyPrincipal required field
- Backend: subscribeEmail function signature adds oisyPrincipal parameter
- Backend: Category adds #cloud_hosting
- Backend: ExtendedUserProfile adds oisyPrincipal: ?Text
- EmailSignupWidget: require OISY principal input before allowing subscribe
- App.tsx: add #ambassador route
- Admin panel: add Airdrop tab showing approved wallet list with export

### Remove
- Nothing removed

## Implementation Plan
1. Update main.mo:
   - Add #cloud_hosting to Category
   - Update EmailSubscriber to include oisyPrincipal: Text
   - Update subscribeEmail to accept oisyPrincipal param
   - Add oisyPrincipal field to ExtendedUserProfile
   - Add AmbassadorProfile type: principalId, displayName, bio, avatarUrl, bannerUrl, socialLinks, mediaItems, customTerms, pricePerCampaign (ckUSDC), joinedAt, status (#pending | #approved | #suspended), tags
   - Add CreatorContract type: id, influencer, client, campaignTitle, description, influencerPrice, clientAgreedToTerms, status (#draft | #pending_agreement | #active | #completed | #disputed | #resolved), termsSnapshot, createdAt, completedAt, disputeReason, daoVotes
   - Add DAOVote type: voter, contractId, vote (#approve | #reject), comment, timestamp
   - Functions: registerAmbassador, getAmbassadorProfile, saveAmbassadorProfile, getAllAmbassadors, createContract, clientAgreeToTerms, completeContract, disputeContract, voteOnContract, getContract, getContractsByAmbassador, getAllPublicContracts, getOpenDisputedContracts
   - Add bonsaiApprovedList: [Principal], markBonsaiApprovedWithSecret, getBonsaiApprovedListWithSecret
2. Update EmailSignupWidget to require oisyPrincipal
3. Update UserProfilePage to save/show oisyPrincipal, add uBin hosting recommendation
4. Add AmbassadorPage.tsx with onboarding, profile editor, contract creation/management
5. Add admin Airdrop tab
6. Add uBin to registry entries
7. Wire #ambassador route in App.tsx
