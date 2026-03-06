/**
 * useIcrc7Nfts — fetch NFTs from an ICRC-7 canister for a given owner principal.
 *
 * Standards:
 * - ICRC-7: icrc7_tokens_of, icrc7_token_metadata
 */
import { useQuery } from "@tanstack/react-query";

export interface Icrc7Nft {
  tokenId: bigint;
  name: string;
  imageUrl: string | null;
  collectionId: string;
}

// ICRC-7 Value type
type Icrc7Value =
  | { Text: string }
  | { Nat: bigint }
  | { Blob: Uint8Array }
  | { Int: bigint }
  | { Array: Icrc7Value[] }
  | { Map: [string, Icrc7Value][] };

function extractString(value: Icrc7Value): string | null {
  if ("Text" in value) return value.Text;
  if ("Nat" in value) return value.Nat.toString();
  if ("Int" in value) return value.Int.toString();
  return null;
}

function findInMap(
  map: [string, Icrc7Value][],
  ...keys: string[]
): Icrc7Value | undefined {
  for (const key of keys) {
    const entry = map.find(([k]) => k === key);
    if (entry) return entry[1];
  }
  return undefined;
}

function extractMetadata(metadata: Array<[string, Icrc7Value]> | null): {
  name: string;
  imageUrl: string | null;
} {
  if (!metadata) return { name: "Unknown NFT", imageUrl: null };

  const nameVal = findInMap(
    metadata,
    "icrc7:metadata:name",
    "name",
    "icrc7:name",
    "Name",
  );
  const imageVal = findInMap(
    metadata,
    "icrc7:metadata:uri:image",
    "icrc7:image",
    "image",
    "thumbnail",
    "icrc7:metadata:thumbnail",
  );

  const name = nameVal
    ? (extractString(nameVal) ?? "Unknown NFT")
    : "Unknown NFT";
  const imageUrl = imageVal ? extractString(imageVal) : null;

  return { name, imageUrl };
}

async function fetchIcrc7Nfts(
  collectionCanisterId: string,
  ownerPrincipal: string,
): Promise<Icrc7Nft[]> {
  if (!collectionCanisterId || !ownerPrincipal) return [];

  const { HttpAgent, Actor } = await import("@icp-sdk/core/agent");
  const { Principal } = await import("@icp-sdk/core/principal");
  const { IDL } = await import("@dfinity/candid");

  // Use the same network as the rest of the app
  const host = window.location.hostname.includes("localhost")
    ? "http://localhost:4943"
    : "https://icp0.io";

  const agent = await HttpAgent.create({ host });

  // Candid IDL for ICRC-7 core methods
  const idlFactory = () => {
    const Account = IDL.Record({
      owner: IDL.Principal,
      subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    });

    const ValueRec = IDL.Rec();
    const Value = IDL.Variant({
      Nat: IDL.Nat,
      Int: IDL.Int,
      Text: IDL.Text,
      Blob: IDL.Vec(IDL.Nat8),
      Array: IDL.Vec(ValueRec),
      Map: IDL.Vec(IDL.Tuple(IDL.Text, ValueRec)),
    });
    ValueRec.fill(Value);

    return IDL.Service({
      icrc7_tokens_of: IDL.Func(
        [Account, IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
        [IDL.Vec(IDL.Nat)],
        ["query"],
      ),
      icrc7_token_metadata: IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [IDL.Vec(IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, Value))))],
        ["query"],
      ),
    });
  };

  const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId: collectionCanisterId,
  }) as {
    icrc7_tokens_of: (
      account: { owner: unknown; subaccount: [] },
      prev: [],
      take: [bigint],
    ) => Promise<bigint[]>;
    icrc7_token_metadata: (
      tokenIds: bigint[],
    ) => Promise<Array<Array<[string, Icrc7Value]> | null>>;
  };

  const ownerPpal = Principal.fromText(ownerPrincipal);

  // Fetch token IDs
  const tokenIds = await actor.icrc7_tokens_of(
    { owner: ownerPpal, subaccount: [] },
    [], // prev: null
    [50n], // take: 50
  );

  if (tokenIds.length === 0) return [];

  // Fetch metadata
  const metadataResults = await actor.icrc7_token_metadata(tokenIds);

  return tokenIds.map((tokenId, idx) => {
    const rawMeta = metadataResults[idx];
    const { name, imageUrl } = extractMetadata(
      rawMeta as Array<[string, Icrc7Value]> | null,
    );
    return {
      tokenId,
      name,
      imageUrl,
      collectionId: collectionCanisterId,
    };
  });
}

export function useIcrc7Nfts(
  collectionCanisterId: string | null,
  ownerPrincipal: string | null,
) {
  return useQuery<Icrc7Nft[]>({
    queryKey: ["icrc7-nfts", collectionCanisterId, ownerPrincipal],
    queryFn: () => fetchIcrc7Nfts(collectionCanisterId!, ownerPrincipal!),
    enabled: !!collectionCanisterId && !!ownerPrincipal,
    staleTime: 60_000,
    retry: 1,
  });
}
