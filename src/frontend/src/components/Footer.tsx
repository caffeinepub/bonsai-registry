import { recordEvent } from "@/utils/analytics";
import { ExternalLink, Heart, TreePine, Trophy } from "lucide-react";

interface FooterProps {
  onTipOpen?: () => void;
}

export function Footer({ onTipOpen }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const hostname =
    typeof window !== "undefined"
      ? window.location.hostname
      : "bonsairegistry.app";
  const caffeineUrl = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`;

  return (
    <footer
      data-ocid="footer.section"
      className="border-t border-border mt-12 bg-secondary/30"
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md overflow-hidden border border-primary/40 flex-shrink-0">
                <img
                  src="https://cdn.shopify.com/s/files/1/0709/4953/5993/files/logo2_a05c26b6-7472-4a3e-b8bc-48dcb6ca4683.png"
                  alt="Bonsai Registry"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <span className="font-display font-bold text-foreground">
                <span className="text-primary">Bonsai</span> Registry
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bridging the Web3 community to the open web. The premiere curated
              directory for decentralized ecosystems.
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TreePine className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>Curating 75+ Decentralized Ecosystems</span>
            </div>
            <a
              href="https://odin.fun/token/26j2?ref=bonsai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-amber-400/30 bg-amber-400/5 text-amber-400 text-xs font-mono hover:bg-amber-400/15 hover:border-amber-400/50 transition-all"
              style={{ boxShadow: "0 0 10px oklch(0.79 0.15 80 / 15%)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Get $BONSAI on Odin.Fun
            </a>
          </div>

          <div className="space-y-3">
            <h3 className="font-display font-bold text-sm text-foreground">
              Ecosystem Partners
            </h3>
            <ul className="space-y-2">
              {[
                {
                  name: "Internet Computer Protocol",
                  url: "https://internetcomputer.org",
                },
                { name: "Hedera Network", url: "https://hedera.com" },
                { name: "HBAR Foundation", url: "https://hbarfoundation.org" },
                { name: "DFINITY Foundation", url: "https://dfinity.org" },
                {
                  name: "Enchanted Bonsai Bazaar",
                  url: "https://t3kno-logic.xyz",
                },
                { name: "Caffeine AI", url: "https://caffeine.ai" },
                { name: "Eliza Labs", url: "https://elizalabs.ai/" },
                {
                  name: "uBin (On-Chain Cloud Hosting)",
                  url: "https://h3cjw-syaaa-aaaam-qbbia-cai.ic0.app/",
                },
                {
                  name: "$BONSAI on Odin.Fun",
                  url: "https://odin.fun/token/26j2?ref=bonsai",
                },
              ].map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-display font-bold text-sm text-foreground">
              About the Registry
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Bonsai Registry is a comprehensive Web3 directory covering
              DeFi protocols, NFT marketplaces, blockchain gaming, decentralized
              wallets, social platforms, and developer tools across 75+
              blockchain ecosystems including Internet Computer (ICP), Hedera
              HBAR, Ethereum, Solana, Bitcoin, Avalanche, Polygon, BNB Chain,
              Cardano, Cosmos, Algorand, Tezos, and more.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Our mission: connect the global Web3 community through a
              searchable, filterable registry of real-world asset tokenization,
              creator tools, gaming platforms, and decentralized finance
              protocols.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground/60 leading-relaxed text-center max-w-4xl mx-auto">
            Web3 directory \u00b7 ICP blockchain \u00b7 Internet Computer
            Protocol \u00b7 Hedera Hashgraph \u00b7 HBAR token \u00b7 DeFi
            protocols \u00b7 NFT marketplace \u00b7 blockchain gaming \u00b7
            decentralized exchange \u00b7 DEX \u00b7 cryptocurrency wallet
            \u00b7 smart contracts \u00b7 DAO governance \u00b7 Layer 2 \u00b7
            Ethereum scaling \u00b7 Solana ecosystem \u00b7 Bitcoin Ordinals
            \u00b7 cross-chain bridge \u00b7 liquid staking \u00b7 yield farming
            \u00b7 tokenized assets \u00b7 RWA
          </p>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            \u00a9 {currentYear} The Bonsai Registry \u00b7 Built by{" "}
            <a
              href="https://t3kno-logic.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              T3knoLogic
            </a>
          </p>
          <div className="flex items-center gap-3">
            {onTipOpen && (
              <button
                type="button"
                data-ocid="footer.tip_button"
                onClick={() => {
                  recordEvent("tip_modal_open", "footer_button");
                  onTipOpen();
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors border border-primary/20 hover:border-primary/40 rounded px-2 py-1"
              >
                <Heart className="w-3 h-3 text-primary fill-primary" />
                Support the Project
              </button>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Built with <Heart className="w-3 h-3 text-primary fill-primary" />{" "}
              using{" "}
              <a
                href={caffeineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                caffeine.ai
              </a>
            </p>
            <button
              type="button"
              data-ocid="footer.leaderboard.link"
              onClick={() => {
                window.location.hash = "#leaderboard";
              }}
              className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-primary transition-colors font-mono"
            >
              <Trophy className="w-3 h-3" />
              Leaderboard
            </button>
            <a
              href="#admin"
              data-ocid="footer.admin_link"
              className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors font-mono"
            >
              Admin
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
