/**
 * useExtNfts — fetch NFTs from an EXT v2 canister for a given owner principal.
 *
 * Standards:
 * - EXT v2: tokens_ext (account identifier), metadata (token identifier)
 *
 * Account Identifier derivation (ICP standard):
 *   accountId = hex(crc32(sha224(domain_sep + principal_bytes + subaccount)) + sha224(...))
 *
 * Token Identifier encoding (EXT standard):
 *   tokenId = base32Nopad(\x0A\x74\x69\x64 + canister_bytes + big_endian_uint32(index))
 */

import { useQuery } from "@tanstack/react-query";
import type { Icrc7Nft } from "./useIcrc7Nfts";

export type { Icrc7Nft };

// ─── SHA-224 (pure JS) ────────────────────────────────────────────────────────
// SHA-224 uses the same algorithm as SHA-256 but with different initial values
// and truncated output to 224 bits (28 bytes).

const SHA224_K: number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

// SHA-224 initial hash values (first 32 bits of the fractional parts of
// the square roots of the 9th through 16th prime numbers)
const SHA224_H0 = [
  0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511,
  0x64f98fa7, 0xbefa4fa4,
];

function rotr32(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function sha224(data: Uint8Array): Uint8Array {
  // Pre-processing: add padding
  const msgLen = data.length;
  const bitLen = msgLen * 8;

  // Padding: 1 bit followed by 0s, then 64-bit big-endian length
  // Total length must be ≡ 448 (mod 512) bits
  const padLen = ((msgLen + 9 + 63) & ~63) - msgLen; // bytes to add
  const padded = new Uint8Array(msgLen + padLen);
  padded.set(data);
  padded[msgLen] = 0x80;
  // Write bit length as 64-bit big-endian (we only handle < 2^32 bits)
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen >>> 0, false);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);

  // Initialize hash values
  let [h0, h1, h2, h3, h4, h5, h6, h7] = SHA224_H0;

  // Process each 512-bit (64-byte) block
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    // Prepare message schedule
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 =
        rotr32(w[i - 15], 7) ^ rotr32(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 =
        rotr32(w[i - 2], 17) ^ rotr32(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    // Initialize working variables
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    // Compression function
    for (let i = 0; i < 64; i++) {
      const S1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA224_K[i] + w[i]) >>> 0;
      const S0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    // Update hash values
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  // SHA-224: output first 7 words (28 bytes), discard h7
  const hash = new Uint8Array(28);
  const hv = new DataView(hash.buffer);
  hv.setUint32(0, h0, false);
  hv.setUint32(4, h1, false);
  hv.setUint32(8, h2, false);
  hv.setUint32(12, h3, false);
  hv.setUint32(16, h4, false);
  hv.setUint32(20, h5, false);
  hv.setUint32(24, h6, false);
  return hash;
}

// ─── CRC32 ────────────────────────────────────────────────────────────────────
function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const CRC32_TABLE = buildCrc32Table();

function crc32(data: Uint8Array): Uint8Array {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  crc = (crc ^ 0xffffffff) >>> 0;
  const result = new Uint8Array(4);
  const view = new DataView(result.buffer);
  view.setUint32(0, crc, false); // big-endian
  return result;
}

// ─── Account Identifier ───────────────────────────────────────────────────────
async function principalToAccountId(principalText: string): Promise<string> {
  const { Principal } = await import("@icp-sdk/core/principal");
  const principal = Principal.fromText(principalText);
  const principalBytes = principal.toUint8Array();
  const subaccount = new Uint8Array(32); // all zeros = default subaccount

  // Domain separator: \x0A + "account-id" (11 bytes total)
  const domainSep = new Uint8Array([
    0x0a, 0x61, 0x63, 0x63, 0x6f, 0x75, 0x6e, 0x74, 0x2d, 0x69,
    0x64,
    // \x0A  a     c     c     o     u     n     t     -     i     d
  ]);

  // Concatenate: domainSep + principalBytes + subaccount
  const data = new Uint8Array(
    domainSep.length + principalBytes.length + subaccount.length,
  );
  data.set(domainSep, 0);
  data.set(principalBytes, domainSep.length);
  data.set(subaccount, domainSep.length + principalBytes.length);

  const hash = sha224(data); // 28 bytes
  const checksum = crc32(hash); // 4 bytes BE

  const result = new Uint8Array(32);
  result.set(checksum, 0);
  result.set(hash, 4);

  return Array.from(result)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── EXT Token Identifier ─────────────────────────────────────────────────────
// EXT token identifier = base32NoPad(\x0A\x74\x69\x64 + canisterBytes + BE_uint32(index))
const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

function base32NoPad(bytes: Uint8Array): string {
  let result = "";
  let bits = 0;
  let value = 0;
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(value >>> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return result;
}

async function encodeTokenIdentifier(
  canisterId: string,
  tokenIndex: number,
): Promise<string> {
  const { Principal } = await import("@icp-sdk/core/principal");
  const canisterBytes = Principal.fromText(canisterId).toUint8Array();

  // "\x0A" + "tid" = [0x0a, 0x74, 0x69, 0x64]
  const prefix = new Uint8Array([0x0a, 0x74, 0x69, 0x64]);
  const indexBytes = new Uint8Array(4);
  new DataView(indexBytes.buffer).setUint32(0, tokenIndex, false); // big-endian

  const data = new Uint8Array(
    prefix.length + canisterBytes.length + indexBytes.length,
  );
  data.set(prefix, 0);
  data.set(canisterBytes, prefix.length);
  data.set(indexBytes, prefix.length + canisterBytes.length);

  return base32NoPad(data);
}

// ─── EXT v2 Candid Types ──────────────────────────────────────────────────────
type ExtCommonError = { InvalidToken: string } | { Other: string };

type ExtListing = {
  locked: [] | [bigint];
  seller: unknown;
  price: bigint;
};

type ExtTokensExtResult =
  | { ok: Array<[number, [] | [ExtListing], [] | [Uint8Array]]> }
  | { err: ExtCommonError };

type ExtMetadata =
  | {
      fungible: {
        name: string;
        symbol: string;
        decimals: number;
        metadata: [] | [Uint8Array];
      };
    }
  | { nonfungible: { metadata: [] | [Uint8Array] } };

type ExtMetadataResult = { ok: ExtMetadata } | { err: ExtCommonError };

// ─── Fetch EXT NFTs ───────────────────────────────────────────────────────────
async function fetchExtNfts(
  collectionCanisterId: string,
  ownerPrincipal: string,
): Promise<Icrc7Nft[]> {
  if (!collectionCanisterId || !ownerPrincipal) return [];

  const { HttpAgent, Actor } = await import("@icp-sdk/core/agent");
  const { IDL } = await import("@dfinity/candid");

  const host = window.location.hostname.includes("localhost")
    ? "http://localhost:4943"
    : "https://icp0.io";

  const agent = await HttpAgent.create({ host });

  // EXT v2 IDL
  const idlFactory = () => {
    const CommonError = IDL.Variant({
      InvalidToken: IDL.Text,
      Other: IDL.Text,
    });

    const Listing = IDL.Record({
      locked: IDL.Opt(IDL.Int),
      seller: IDL.Principal,
      price: IDL.Nat64,
    });

    const TokensExtResult = IDL.Variant({
      ok: IDL.Vec(
        IDL.Tuple(IDL.Nat32, IDL.Opt(Listing), IDL.Opt(IDL.Vec(IDL.Nat8))),
      ),
      err: CommonError,
    });

    const FungibleMetadata = IDL.Record({
      name: IDL.Text,
      symbol: IDL.Text,
      decimals: IDL.Nat8,
      metadata: IDL.Opt(IDL.Vec(IDL.Nat8)),
    });

    const Metadata = IDL.Variant({
      fungible: FungibleMetadata,
      nonfungible: IDL.Record({ metadata: IDL.Opt(IDL.Vec(IDL.Nat8)) }),
    });

    const MetadataResult = IDL.Variant({
      ok: Metadata,
      err: CommonError,
    });

    return IDL.Service({
      tokens_ext: IDL.Func([IDL.Text], [TokensExtResult], ["query"]),
      metadata: IDL.Func([IDL.Text], [MetadataResult], ["query"]),
    });
  };

  const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId: collectionCanisterId,
  }) as {
    tokens_ext: (accountId: string) => Promise<ExtTokensExtResult>;
    metadata: (tokenId: string) => Promise<ExtMetadataResult>;
  };

  // Derive the ICP account identifier from principal
  const accountId = await principalToAccountId(ownerPrincipal);

  // Fetch tokens owned by this account
  const result = await actor.tokens_ext(accountId);

  if ("err" in result) {
    return [];
  }

  const tokens = result.ok;
  if (tokens.length === 0) return [];

  // Cap at 50 tokens for performance
  const capped = tokens.slice(0, 50);

  // Fetch metadata for each token in parallel (batch of 10 at a time)
  const BATCH_SIZE = 10;
  const nfts: Icrc7Nft[] = [];

  for (let i = 0; i < capped.length; i += BATCH_SIZE) {
    const batch = capped.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async ([tokenIndex]) => {
        const tokenId = encodeTokenIdentifier(collectionCanisterId, tokenIndex);
        let imageUrl: string | null = null;

        try {
          const tokenIdStr = await tokenId;
          const metaResult = await actor.metadata(tokenIdStr);

          if ("ok" in metaResult) {
            const meta = metaResult.ok;
            if ("nonfungible" in meta) {
              const blobOpt = meta.nonfungible.metadata;
              if (blobOpt && blobOpt.length > 0) {
                const blob = blobOpt[0];
                // Try decoding as UTF-8 URL
                try {
                  const decoded = new TextDecoder("utf-8", {
                    fatal: true,
                  }).decode(blob);
                  if (
                    decoded.startsWith("http") ||
                    decoded.startsWith("data:")
                  ) {
                    imageUrl = decoded;
                  } else {
                    // Try JSON parse for metadata objects with image field
                    try {
                      const parsed = JSON.parse(decoded);
                      if (parsed?.image) imageUrl = parsed.image;
                      else if (parsed?.imageUrl) imageUrl = parsed.imageUrl;
                      else if (parsed?.url) imageUrl = parsed.url;
                    } catch {
                      // not JSON
                    }
                  }
                } catch {
                  // binary blob, not a URL
                }
              }
            }
          }
        } catch {
          // metadata fetch failed, continue without image
        }

        return {
          tokenId: BigInt(tokenIndex),
          name: `Token #${tokenIndex}`,
          imageUrl,
          collectionId: collectionCanisterId,
        } satisfies Icrc7Nft;
      }),
    );
    nfts.push(...batchResults);
  }

  return nfts;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useExtNfts(
  collectionCanisterId: string | null,
  ownerPrincipal: string | null,
) {
  return useQuery<Icrc7Nft[]>({
    queryKey: ["ext-nfts", collectionCanisterId, ownerPrincipal],
    queryFn: () => fetchExtNfts(collectionCanisterId!, ownerPrincipal!),
    enabled: !!collectionCanisterId && !!ownerPrincipal,
    staleTime: 60_000,
    retry: 1,
  });
}
