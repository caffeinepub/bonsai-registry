import { useEffect, useRef, useState } from "react";

interface TokenPrice {
  symbol: string;
  price: number | null;
  prev: number | null;
}

interface PrevPrices {
  BONSAI: number | null;
  ICP: number | null;
  BTC: number | null;
  USDC: number;
}

const BONSAI_URL = "https://odin.fun/token/26j2?ref=bonsai";

function formatPrice(price: number | null, symbol: string): string {
  if (price === null) return "\u2014";
  if (symbol === "BTC")
    return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (symbol === "ICP") return `$${price.toFixed(2)}`;
  if (symbol === "USDC") return "$1.00";
  if (price < 0.001) return `$${price.toFixed(8)}`;
  return `$${price.toFixed(6)}`;
}

function Arrow({ cur, prev }: { cur: number | null; prev: number | null }) {
  if (cur === null || prev === null || cur === prev)
    return <span className="text-muted-foreground/40 text-[9px]">\u2014</span>;
  if (cur > prev)
    return <span className="text-emerald-400 text-[10px]">\u25b2</span>;
  return <span className="text-red-400 text-[10px]">\u25bc</span>;
}

export function PriceTicker() {
  const [prices, setPrices] = useState<TokenPrice[]>([
    { symbol: "BONSAI", price: null, prev: null },
    { symbol: "ICP", price: null, prev: null },
    { symbol: "BTC", price: null, prev: null },
    { symbol: "USDC", price: 1, prev: 1 },
  ]);
  const prevRef = useRef<PrevPrices>({
    BONSAI: null,
    ICP: null,
    BTC: null,
    USDC: 1,
  });

  const fetchPrices = async () => {
    const [icpRes, btcRes, odinRes] = await Promise.allSettled([
      fetch("https://api.kraken.com/0/public/Ticker?pair=ICPUSD"),
      fetch("https://api.kraken.com/0/public/Ticker?pair=XBTUSD"),
      fetch("https://api.odin.fun/v1/token/26j2"),
    ]);

    let icp: number | null = null;
    let btc: number | null = null;
    let bonsai: number | null = null;

    if (icpRes.status === "fulfilled" && icpRes.value.ok) {
      try {
        const d = await icpRes.value.json();
        const val = d?.result?.ICPUSD?.c?.[0];
        if (val) icp = Number.parseFloat(val);
      } catch {}
    }

    if (btcRes.status === "fulfilled" && btcRes.value.ok) {
      try {
        const d = await btcRes.value.json();
        const val = d?.result?.XXBTZUSD?.c?.[0];
        if (val) btc = Number.parseFloat(val);
      } catch {}
    }

    if (odinRes.status === "fulfilled" && odinRes.value.ok) {
      try {
        const d = await odinRes.value.json();
        bonsai = d?.data?.price ?? null;
      } catch {}
    }

    const snapshot = prevRef.current;
    setPrices((prev) => {
      const prevMap = prev.reduce<PrevPrices>(
        (acc, p) => {
          if (p.symbol === "BONSAI") acc.BONSAI = p.price;
          else if (p.symbol === "ICP") acc.ICP = p.price;
          else if (p.symbol === "BTC") acc.BTC = p.price;
          return acc;
        },
        { BONSAI: null, ICP: null, BTC: null, USDC: 1 },
      );
      const next: TokenPrice[] = [
        {
          symbol: "BONSAI",
          price: bonsai,
          prev: snapshot.BONSAI ?? prevMap.BONSAI,
        },
        { symbol: "ICP", price: icp, prev: snapshot.ICP ?? prevMap.ICP },
        { symbol: "BTC", price: btc, prev: snapshot.BTC ?? prevMap.BTC },
        { symbol: "USDC", price: 1, prev: 1 },
      ];
      prevRef.current = { BONSAI: bonsai, ICP: icp, BTC: btc, USDC: 1 };
      return next;
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchPrices is stable, run once
  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground/60 uppercase tracking-widest flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        LIVE
      </span>
      {prices.map((p, i) => {
        const up = p.price !== null && p.prev !== null && p.price > p.prev;
        const down = p.price !== null && p.prev !== null && p.price < p.prev;
        const isBonsai = p.symbol === "BONSAI";
        const color = up
          ? "text-emerald-400"
          : down
            ? "text-red-400"
            : "text-muted-foreground/70";
        const inner = (
          <span
            className={`flex items-center gap-0.5 font-mono text-[10px] ${color}`}
          >
            <span
              className={`font-bold ${isBonsai ? "text-amber-400" : "text-foreground/70"}`}
            >
              ${p.symbol}
            </span>
            <span className="ml-0.5">{formatPrice(p.price, p.symbol)}</span>
            <Arrow cur={p.price} prev={p.prev} />
          </span>
        );
        return (
          <span key={p.symbol} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-border/60 text-[9px]">|</span>}
            {isBonsai ? (
              <a
                href={BONSAI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                {inner}
              </a>
            ) : (
              inner
            )}
          </span>
        );
      })}
    </div>
  );
}
