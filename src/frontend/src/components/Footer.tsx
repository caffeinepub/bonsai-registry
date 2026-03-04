import { ExternalLink, Heart, TreePine } from "lucide-react";

export function Footer() {
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
          {/* Brand column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md overflow-hidden border border-primary/40 flex-shrink-0">
                <img
                  src="https://cdn.shopify.com/s/files/1/0709/4953/5993/files/logo2_a05c26b6-7472-4a3e-b8bc-48dcb6ca4683.png"
                  alt="Bonsai Registry"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              </div>
              <span className="font-display font-bold text-foreground">
                <span className="text-primary">Bonsai</span> Registry
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bridging the Web3 community to the open web. The premiere curated
              directory for decentralized ecosystems — from Internet Computer to
              Hedera, Bitcoin to emerging chains.
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TreePine className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>Curating 75+ Decentralized Ecosystems</span>
            </div>
          </div>

          {/* Links column */}
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

          {/* SEO & About column */}
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

        {/* SEO keyword paragraph */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground/60 leading-relaxed text-center max-w-4xl mx-auto">
            Web3 directory · ICP blockchain · Internet Computer Protocol ·
            Hedera Hashgraph · HBAR token · DeFi protocols · NFT marketplace ·
            blockchain gaming · decentralized exchange · DEX · cryptocurrency
            wallet · smart contracts · DAO governance · Layer 2 · Ethereum
            scaling · Solana ecosystem · Bitcoin Ordinals · cross-chain bridge ·
            liquid staking · yield farming · tokenized assets · RWA
          </p>
        </div>

        {/* Copyright */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © {currentYear} The Bonsai Registry · Built by{" "}
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
