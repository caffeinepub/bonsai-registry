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
    address: "65b006befe37a7b1ea0573c201c285fcbdc069719a42c54de4108fc13b5db3c0",
    logoUrl: "https://cryptologos.cc/logos/internet-computer-icp-logo.png",
    enabled: true,
    network: "ICP Network",
  },
  {
    token: "Bitcoin",
    symbol: "BTC",
    address: "bc1q2s6gzultclk5x7l3202h9jyf339aczjn282w4x",
    logoUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
    enabled: true,
    network: "Bitcoin Network",
  },
  {
    token: "Ethereum",
    symbol: "ETH",
    address: "0xCc06481844aa8913Dd6C6b55779D9c1c6bC37aEd",
    logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    enabled: true,
    network: "Ethereum Network",
  },
  {
    token: "Hedera",
    symbol: "HBAR",
    address: "0.0.10232378",
    logoUrl: "https://cryptologos.cc/logos/hedera-hbar-logo.png",
    enabled: true,
    network: "Hedera Network",
  },
  {
    token: "Solana",
    symbol: "SOL",
    address: "96FzwSZaKEATzCZjfyg3WREoKVcpED5Y1oDiqe6XAJSt",
    logoUrl: "https://cryptologos.cc/logos/solana-sol-logo.png",
    enabled: true,
    network: "Solana Network",
  },
];
