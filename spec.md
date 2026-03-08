# Bonsai Registry

## Current State
- Static registry data in `registryData.ts` with 600+ entries across 34 ecosystems (Bitcoin, Ethereum, Solana, Hedera, ICP, Avalanche, and more)
- News data in `newsData.ts` with 39 ICP news articles and 3 scam alerts
- Monetization data in `monetizationData.ts` with featured/verified/sponsored entries
- Backend supports editable entries via bulk import
- Full feature set: admin panel, community ratings, user profiles, OISY wallet, leaderboard, analytics, tipping

## Requested Changes (Diff)

### Add
- ~120 new ICP ecosystem entries from `bonsai-registry-extended.json`:
  - Developer agents: agent-js, ic-js, icblast, node-ic0, agent-rs, dfx, agent_dart, agent-go, agent-unity, ICP.NET
  - CDK frameworks: ic-cdk (Rust), Kybra (Python), Azle (JS/TS), Chico (C/C++), icpp (C++), cdk-as (AssemblyScript), Ego, CDK Framework
  - Motoko ecosystem: MOPS, Vessel, Motoko GitHub Repo, Motoko Playground, Motoko VS Code, Motoko.js, Motoko Formatter, Embed Motoko, Blocks editor, Awesome Motoko
  - Candid tools: Candid GitHub Repo, Candid UI, didc, idl2json, Intellij Plugin, + language-specific Candid libs (JS, Dart, C#, Kotlin, Elm, Haskell, Java, AssemblyScript, Motoko)
  - Database/storage: CanDB, ic-sqlite, ic-stable-memory, stable-structures
  - Token standards: ICRC-1, ICRC-2, DIP20, DIP721, EXT, Origyn NFT
  - Developer tooling: IC Inspector, Canistergeek, ic-repl, ICPipeline, ic-nix, canister-profiling
  - Cross-chain tools: Chain-key ECDSA, EVM Utility Canister, ic-web3, Terabethia, Omnic, Orally, No key wallet
  - DeFi: Exchange Rate Canister, DeSwap Orderbook, Spinner, ICTC, Axon, SNS
  - Wallets: AstroX Me, Bitfinity, NFID, Stoic, connect2ic
  - Registries/explorers: Canlista, Cyql, ICLighthouse Explorer, ICSCAN, ICP Ecosystem Showcase
  - Starter templates: create-ic, create-ic-app, ic-rust-starter, vite-react-motoko, canister-sdk
  - Social: Messity, OpenChat (GitHub), W3NS
  - Gaming: WebGL Sample
  - Other tools: ic-blackhole, Metrics encoder, Launchtrail, ic-nix
  - Learning: Internet Computer Developer Hub, IC Sample Dapps, Considerations for NFT Developers, Developer Grants Video, Language Guide
  - Tutorials: Rust+React+II tutorial, Access control, Backup/Restore, Hosting ERC-721 metadata, Migration Motoko→Rust, Converting ICP to Cycles, Social Platform SEO, etc.
- New Bitcoin entries: Bitcoin.org, Blockstream Explorer, Liquid Network, Runes Protocol, Hiro (Stacks), Leather Wallet, BlueWallet, Muun, Phoenix Wallet, Zest Protocol, Bitflow Finance, sBTC Bridge, Blockstream (Infrastructure), Ordinals.com
- New Hedera entries: WallaWallet, Hashport, HashGuild, RedSwan CRE, Hedera Asset Tokenization Studio, HeadStarter, HLiquity, Hedera AI Studio, Hedera Agent Marketplace, TrackTrace, atma.io, DOVU, Verra, Hedera Guardian, AUDD, Hedera Stablecoin Studio, ioBuilders, Archax, EarthID, Hedera Web3 Applications
- New Solana entries: Helius, Triton, Solscan, Pump.fun, Kamino Finance, Mango Markets, Meteora, Parcl, Wormhole, Exchange Art, Genopets, CyberFrogs, DeFira, SolChicks
- 7 new news articles from DFINITY Medium blog (IDs 40-46)

### Modify
- `newsData.ts`: append 7 new DFINITY blog articles from the GitHub repo that are missing from the current dataset

### Remove
- Nothing

## Implementation Plan
1. Append new ICP entries to the `icpEntries` array in `registryData.ts` with unique IDs (icp-dev-001 etc.)
2. Append new Bitcoin entries to `bitcoinEntries` array
3. Append new Hedera entries to `hederaEntries` array
4. Append new Solana entries to `solanaEntries` array
5. Append 7 new news articles to `icpNews` array in `newsData.ts`
6. Run validation and deploy
