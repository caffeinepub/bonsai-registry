export interface TipToken {
  token: string;
  symbol: string;
  address: string;
  logoUrl?: string;
  enabled: boolean;
  network?: string;
}

export const TIP_TOKENS: TipToken[] = [
  {
    token: "Internet Computer",
    symbol: "ICP",
    address: "YOUR_ICP_WALLET_ADDRESS",
    logoUrl: "https://cryptologos.cc/logos/internet-computer-icp-logo.png",
    enabled: true,
    network: "ICP Network",
  },
  {
    token: "Bitcoin",
    symbol: "BTC",
    address: "YOUR_BTC_WALLET_ADDRESS",
    logoUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
    enabled: true,
    network: "Bitcoin Network",
  },
  {
    token: "Ethereum",
    symbol: "ETH",
    address: "YOUR_ETH_WALLET_ADDRESS",
    logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    enabled: true,
    network: "Ethereum Network",
  },
  {
    token: "Hedera",
    symbol: "HBAR",
    address: "YOUR_HBAR_WALLET_ADDRESS",
    logoUrl: "https://cryptologos.cc/logos/hedera-hbar-logo.png",
    enabled: true,
    network: "Hedera Network",
  },
  {
    token: "Solana",
    symbol: "SOL",
    address: "YOUR_SOL_WALLET_ADDRESS",
    logoUrl: "https://cryptologos.cc/logos/solana-sol-logo.png",
    enabled: true,
    network: "Solana Network",
  },
];
