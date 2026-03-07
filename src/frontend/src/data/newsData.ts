export interface NewsArticle {
  id: number;
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  description?: string;
  tags: string[];
}

export interface ScamAlert {
  id: number;
  title: string;
  url: string;
  description: string;
  severity: "high" | "medium" | "low";
  source: string;
  publishedAt: string;
}

export const icpNews: NewsArticle[] = [
  {
    id: 1,
    title:
      "Internet Computer Unleashes New Era of Speed, Developer Ease, and Onchain Storage",
    url: "https://medium.com/dfinity/internet-computer-unleashes-new-era-of-speed-developer-ease-and-onchain-storage-with-major-d0ebcfa5b0e4",
    source: "DFINITY Blog",
    tags: ["upgrades", "tokamak", "beryllium"],
  },
  {
    id: 2,
    title: "ICP HUB USA Launches, Supporting Global Expansion",
    url: "https://www.prweb.com/releases/icp-hub-usa-launches-supporting-global-expansion-of-the-internet-computer-protocol-icp-302383060.html",
    source: "PRWeb",
    tags: ["hub", "usa"],
  },
  {
    id: 3,
    title:
      "Validation Cloud and DFINITY Partner for Enterprise Blockchain Analytics",
    url: "https://blog.validationcloud.io/dfinity-icp-elliptic",
    source: "Validation Cloud",
    tags: ["partnership", "enterprise"],
  },
  {
    id: 4,
    title: "DFINITY Launches $5M DeAI Grant for Decentralized AI on ICP",
    url: "https://www.prnewswire.com/news-releases/dfinity-foundation-launches-5-million-grant-to-support-decentralized-ai-on-the-internet-computer-blockchain-301877065.html",
    source: "PRNewswire",
    tags: ["grant", "ai"],
  },
  {
    id: 5,
    title: "BTC Flower: Generative NFTs on ICP Bloom Into DAO",
    url: "https://medium.com/dfinity/btc-flower-generative-nfts-on-the-internet-computer-bloom-into-dao-559ffc78cb69",
    source: "DFINITY Blog",
    tags: ["nft", "dao"],
  },
  {
    id: 6,
    title: "Developer Weekly Update | Internet Computer",
    url: "https://internetcomputer.org/blog",
    source: "internetcomputer.org",
    tags: ["developer", "updates"],
  },
  {
    id: 7,
    title: "CycleOps Builds Mission70 Cost Calculator for ICP Memory Pricing",
    url: "https://forum.dfinity.org/t/we-built-a-tool-in-cycleops-to-help-answer-your-mission70-cost-questions/65134",
    source: "DFINITY Forum",
    publishedAt: "2026-03-05",
    tags: ["community", "tools"],
  },
  {
    id: 8,
    title: "A Fully On-Chain Trading System Coming to ICP — SSS v3",
    url: "https://forum.dfinity.org/t/a-really-fully-on-chain-trading-system-is-coming-on-icp/65119",
    source: "DFINITY Forum",
    publishedAt: "2026-03-05",
    tags: ["community", "defi"],
  },
  {
    id: 9,
    title: "Kasane Chain Testnet Alpha: EVM Execution Canister on ICP",
    url: "https://forum.dfinity.org/t/kasane-chain-testnet-alpha-evm-execution-canister-on-icp/65096",
    source: "DFINITY Forum",
    publishedAt: "2026-03-04",
    tags: ["community", "evm"],
  },
  {
    id: 10,
    title: "Waifu.ai: Multi-LLM Suite with On-Chain Agent Launched on ICP",
    url: "https://forum.dfinity.org/t/introducing-waifu-ai-a-multi-lmm-suite-with-a-small-agent/65104",
    source: "DFINITY Forum",
    publishedAt: "2026-03-04",
    tags: ["community", "ai"],
  },
  {
    id: 11,
    title: "PP Terminal: AI-Built Multi-DEX Token Screener Live on ICP",
    url: "https://forum.dfinity.org/t/pp-terminal-ai-built-multi-dex-token-screener-live-on-icp-feedback-welcome/64598",
    source: "DFINITY Forum",
    publishedAt: "2026-02-24",
    tags: ["community", "defi"],
  },
  {
    id: 12,
    title: "Icycast.com ICRC37 NFT Marketplace Launched",
    url: "https://forum.dfinity.org/t/icycast-com-icrc37-nft-marketplace/64748",
    source: "DFINITY Forum",
    publishedAt: "2026-02-26",
    tags: ["community", "nft"],
  },
  {
    id: 13,
    title: "ic-dbms 0.6: Relational Database Inside ICP Canisters",
    url: "https://forum.dfinity.org/t/ic-dbms-0-6-whats-new-since-launch/65051",
    source: "DFINITY Forum",
    publishedAt: "2026-03-02",
    tags: ["community", "tools"],
  },
  {
    id: 14,
    title: "Chain-key Signing Performance Improvements Announced",
    url: "https://forum.dfinity.org/t/chain-key-signing-performance-improvements/64672",
    source: "DFINITY Forum",
    publishedAt: "2026-02-25",
    tags: ["community", "protocol"],
  },
  {
    id: 15,
    title: "Full-Stack SQLite-Powered Website in One ICP Canister",
    url: "https://forum.dfinity.org/t/full-stack-sqlite-powered-website-and-search-engine-in-one-canister/64723",
    source: "DFINITY Forum",
    publishedAt: "2026-02-25",
    tags: ["community", "tools"],
  },
  {
    id: 16,
    title: "PropXchain: UK Property Conveyancing on ICP",
    url: "https://forum.dfinity.org/t/propxchain-uk-property-conveyancing-on-icp-looking-for-community-feedback/64776",
    source: "DFINITY Forum",
    publishedAt: "2026-02-26",
    tags: ["community", "rwa"],
  },
  {
    id: 17,
    title: "Motoko ICRC 1,2,3,4,21,106,107 Full Suite Updated",
    url: "https://forum.dfinity.org/t/motoko-icrc-1-2-3-4-21-106-107-index-ng-and-rosetta/64819",
    source: "DFINITY Forum",
    publishedAt: "2026-02-26",
    tags: ["community", "developer"],
  },
  {
    id: 18,
    title: "ic-asset-router: File-Based HTTP Routing for ICP Canisters",
    url: "https://forum.dfinity.org/t/ic-asset-router-file-based-http-routing-with-automatic-response-certification-for-icp-canisters/64827",
    source: "DFINITY Forum",
    publishedAt: "2026-02-27",
    tags: ["community", "tools"],
  },
  {
    id: 19,
    title: "Consensus Protocol Live: x402 Proxy and WebSocket Service on ICP",
    url: "https://forum.dfinity.org/t/consensus-protocol-is-live-x402-proxy-and-websocket-service/64526",
    source: "DFINITY Forum",
    publishedAt: "2026-02-22",
    tags: ["community", "infrastructure"],
  },
  {
    id: 20,
    title: "Why ICP Is Essential",
    url: "https://medium.com/dfinity/why-icp-is-essential-5e9ffe870da1",
    source: "DFINITY Blog",
    publishedAt: "2025-08-22",
    tags: ["blog"],
  },
  {
    id: 21,
    title: "Bringing LLMs to the Internet Computer",
    url: "https://medium.com/dfinity/bringing-llms-to-the-internet-computer-1f6df29da2c5",
    source: "DFINITY Blog",
    publishedAt: "2025-08-20",
    tags: ["blog", "ai"],
  },
  {
    id: 22,
    title: "Internet Identity 2.0: The New User Experience",
    url: "https://medium.com/dfinity/internet-identity-2-0-the-new-user-experience-cf04243e8c32",
    source: "DFINITY Blog",
    publishedAt: "2025-08-18",
    tags: ["blog", "identity"],
  },
  {
    id: 23,
    title: "The Bitcoin DeFi Renaissance",
    url: "https://medium.com/dfinity/the-bitcoin-defi-renaissance-6e73b1c29310",
    source: "DFINITY Blog",
    publishedAt: "2025-08-15",
    tags: ["blog", "bitcoin", "defi"],
  },
  {
    id: 24,
    title: "Who Controls Your Digital Life?",
    url: "https://medium.com/dfinity/who-controls-your-digital-life-26647a95ed2f",
    source: "DFINITY Blog",
    publishedAt: "2025-08-08",
    tags: ["blog"],
  },
  {
    id: 25,
    title: "From Decentralization to AI: World Computer Tech Talks Recap",
    url: "https://medium.com/dfinity/from-decentralization-to-ai-world-computer-tech-talks-recap-26ff4afe03d6",
    source: "DFINITY Blog",
    publishedAt: "2025-08-07",
    tags: ["blog", "ai"],
  },
  {
    id: 26,
    title: "How Juno Aims to Put Developers Back in Control",
    url: "https://medium.com/dfinity/how-juno-aims-to-put-developers-back-in-control-e1ffc208c680",
    source: "DFINITY Blog",
    publishedAt: "2025-07-28",
    tags: ["blog", "tools"],
  },
  {
    id: 27,
    title: "Real-time Transparency with Public API Boundary Node Access Logs",
    url: "https://medium.com/dfinity/real-time-transparency-with-public-api-boundary-node-access-logs-5ecf0a5017fe",
    source: "DFINITY Blog",
    publishedAt: "2025-07-24",
    tags: ["blog", "infrastructure"],
  },
  {
    id: 28,
    title: "Hello, Self-Writing Internet: Creations and Conversations",
    url: "https://medium.com/dfinity/hello-self-writing-internet-creations-and-conversations-3027cefb28be",
    source: "DFINITY Blog",
    publishedAt: "2025-07-18",
    tags: ["blog"],
  },
  {
    id: 29,
    title: "The Internet Computer's Privacy Era: vetKeys Unlocked",
    url: "https://medium.com/dfinity/the-internet-computers-privacy-era-vetkeys-unlocked-4ded7c206c38",
    source: "DFINITY Blog",
    publishedAt: "2025-07-07",
    tags: ["blog", "privacy"],
  },
  {
    id: 30,
    title: "Deterministic Capital Protocol (ICP) — Seeking Developer",
    url: "https://forum.dfinity.org/t/new-project-deterministic-capital-protocol-icp/65053",
    source: "DFINITY Forum",
    publishedAt: "2026-03-02",
    tags: ["community", "defi"],
  },
  {
    id: 31,
    title: "Updated Timer Tool for Motoko v0.2.0",
    url: "https://forum.dfinity.org/t/updated-timer-tool-for-motoko/64815",
    source: "DFINITY Forum",
    publishedAt: "2026-02-26",
    tags: ["community", "developer"],
  },
  {
    id: 32,
    title: "Tor .onion Endpoint Discussion for ICP Boundary Nodes",
    url: "https://forum.dfinity.org/t/has-there-been-any-discussion-around-native-onion-tor-endpoints-for-boundary-nodes/64710",
    source: "DFINITY Forum",
    publishedAt: "2026-02-25",
    tags: ["community", "privacy"],
  },
  {
    id: 33,
    title: "Delete Unused Canisters to Avoid Recurring Fees",
    url: "https://forum.dfinity.org/t/delete-unused-canisters-and-consolidate-cycles-to-avoid-recurring-fees/64847",
    source: "DFINITY Forum",
    publishedAt: "2026-02-28",
    tags: ["community", "developer"],
  },
  {
    id: 34,
    title: "Find ICRC Transaction by Memo — Developer Discussion",
    url: "https://forum.dfinity.org/t/find-icrc-transaction-by-memo/64833",
    source: "DFINITY Forum",
    publishedAt: "2026-02-27",
    tags: ["community", "developer"],
  },
  {
    id: 35,
    title: "Motoko — ICRC 1,2,3,4,21,106,107,Index-NG, and Rosetta",
    url: "https://forum.dfinity.org/t/motoko-icrc-1-2-3-4-21-106-107-index-ng-and-rosetta/64819",
    source: "DFINITY Forum",
    publishedAt: "2026-02-26",
    tags: ["community", "standard"],
  },
  {
    id: 36,
    title:
      "Internet Identity – Ability to Rename Identities After v2 Migration",
    url: "https://forum.dfinity.org/t/internet-identity-ability-to-rename-identities-after-v2-migration/65078",
    source: "DFINITY Forum",
    publishedAt: "2026-03-03",
    tags: ["community", "identity"],
  },
  {
    id: 37,
    title: "European Subnet Experiencing Timeouts on Update Messages",
    url: "https://forum.dfinity.org/t/european-subnet-experiencing-timeouts-on-update-messages/65121",
    source: "DFINITY Forum",
    publishedAt: "2026-03-05",
    tags: ["community", "infrastructure"],
  },
  {
    id: 38,
    title: "Percentage Fees for ICRC-1 Tokens — Developer Discussion",
    url: "https://forum.dfinity.org/t/percentage-fees-for-icrc-1-tokens/65107",
    source: "DFINITY Forum",
    publishedAt: "2026-03-04",
    tags: ["community", "standard"],
  },
  {
    id: 39,
    title: "DFINITY Investigates Potential Issues with lhg73 Subnet",
    url: "https://forum.dfinity.org/t/request-for-dfinity-team-assistance-in-investigating-potential-issues-with-the-lhg73-subnet/64921",
    source: "DFINITY Forum",
    publishedAt: "2026-02-28",
    tags: ["community", "infrastructure"],
  },
];

export const scamAlerts: ScamAlert[] = [
  {
    id: 1,
    title: "ICP Scam Alert: Transaction Address Spoofing",
    url: "https://forum.dfinity.org/t/icp-scam-alert-fraudsters-exploit-similar-transaction-addresses-mimicking-prefixes-and-suffixes-to-deceive-users/40298",
    description:
      "Fraudsters create addresses mimicking legitimate prefixes/suffixes to deceive users.",
    severity: "high",
    source: "forum.dfinity.org",
    publishedAt: "2024",
  },
  {
    id: 2,
    title: "Security Advisory: SIW E/B/S Prone to Phishing",
    url: "https://forum.dfinity.org/t/security-advisory-sign-in-with-ethereum-bitcoin-solana-siw-e-b-s-prone-to-phishing/64050",
    description:
      "Sign-In with Ethereum/Bitcoin/Solana implementations prone to phishing.",
    severity: "high",
    source: "forum.dfinity.org",
    publishedAt: "2025",
  },
  {
    id: 3,
    title: "Candid Security Advisory - Upgrade Required",
    url: "https://internetcomputer.org/blog/news-and-updates/candid-security-advisory",
    description: "Candid library vulnerability; upgrade to 0.9.10+ required.",
    severity: "medium",
    source: "internetcomputer.org",
    publishedAt: "2024",
  },
];
