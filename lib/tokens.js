import { getAddress } from "viem";

/** Official Pacific Mainnet tokens: https://docs.pharos.xyz/getting-started/token-registry */
export const PACIFIC = {
  USDC: { symbol: "USDC", address: getAddress("0xc879c018db60520f4355c26ed1a6d572cdac1815"), decimals: 6, protocol: "Circle USDC" },
  USDCe: { symbol: "USDCe", chainSymbol: "USDC.e", address: getAddress("0x7126C3FeF4e6a680eeE09Fb039B2236F638384B0"), decimals: 6, protocol: "Bridged USDC" },
  WPROS: { symbol: "WPROS", address: getAddress("0x52c48d4213107b20bc583832b0d951fb9ca8f0b0"), decimals: 18, protocol: "WPROS wrap" },
  LINK: { symbol: "LINK", address: getAddress("0x51e2A24742Db77604B881d6781Ee16B5b8fcBE29"), decimals: 18, protocol: "Chainlink" },
  WETH: { symbol: "WETH", address: getAddress("0x1f4b7011Ee3d53969bb67F59428a9ec0477856E9"), decimals: 18, protocol: "Wrapped ETH" },
};

/** Extra ERC-20s used on Pacific (ProsPilot list). Not in the official docs registry. */
export const EXTRA_TOKENS = {
  PGOLD: { symbol: "PGOLD", address: getAddress("0x531f1e4A3CA96b9f42467659d8088b07FE8D2839"), decimals: 18, protocol: "PGOLD" },
  USDpm: { symbol: "USDpm", address: getAddress("0x16A7228ac1e772C5029d7069f3A6ECA66F894218"), decimals: 18, protocol: "USDpm" },
};

export const FAROSWAP_V3 = {
  npm: getAddress("0xc0479219f4feba5a668cff71bf96f4ffe124c3ab"),
  factory: getAddress("0x2c90ccb0b989afa2433f499698451a25744a552b"),
  poolWprosUsdc100: getAddress("0x912c9aDe24D44d8922f0866D8Dcb079f1363f647"),
  dodoApprove: getAddress("0xbf105f4ffbd3825f5433d074008b9a76237d849c"),
};

export const TOKEN_LIST = Object.values(PACIFIC);

export const KNOWN_ADDRESSES = {
  [PACIFIC.USDC.address.toLowerCase()]: { pt: "USDC oficial (Circle)", en: "official USDC (Circle)" },
  [PACIFIC.USDCe.address.toLowerCase()]: { pt: "USDC bridged (USDCe)", en: "bridged USDC (USDCe)" },
  [PACIFIC.WPROS.address.toLowerCase()]: { pt: "Wrapped PROS (WPROS)", en: "Wrapped PROS (WPROS)" },
  [PACIFIC.LINK.address.toLowerCase()]: { pt: "LINK (Chainlink)", en: "LINK (Chainlink)" },
  [PACIFIC.WETH.address.toLowerCase()]: { pt: "WETH oficial", en: "official WETH" },
  "0x0000000000000000000000000000000000000000": { pt: "endereço zero", en: "zero address" },
  "0x000000000000000000000000000000000000dead": { pt: "endereço de queima", en: "burn address" },
  "0xa5ca5fbe34e444f366b373170541ec6902b0f75c": { pt: "FaroSwap", en: "FaroSwap" },
  "0xbf105f4ffbd3825f5433d074008b9a76237d849c": { pt: "FaroSwap (DODO Approve)", en: "FaroSwap (DODO Approve)" },
  "0xc0479219f4feba5a668cff71bf96f4ffe124c3ab": { pt: "FaroSwap V3 NPM", en: "FaroSwap V3 NPM" },
  "0x2c90ccb0b989afa2433f499698451a25744a552b": { pt: "FaroSwap V3 factory", en: "FaroSwap V3 factory" },
  "0x912c9ade24d44d8922f0866d8dcb079f1363f647": { pt: "FaroSwap WPROS/USDC 0.01% pool", en: "FaroSwap WPROS/USDC 0.01% pool" },
  "0x531f1e4a3ca96b9f42467659d8088b07fe8d2839": { pt: "PGOLD", en: "PGOLD" },
  "0x16a7228ac1e772c5029d7069f3a6eca66f894218": { pt: "USDpm", en: "USDpm" },
  "0xff70f4a1d11995621854f3692acf286d8acd04b2": { pt: "Jumper (LI.FI)", en: "Jumper (LI.FI)" },
  "0x36c800d4472fbb888d034aa74778f481aee01fec": { pt: "Jumper (LI.FI)", en: "Jumper (LI.FI)" },
  "0x28b5a0e9c621a5badaa536219b3a228c8168cf5d": { pt: "CCTP TokenMessenger", en: "CCTP TokenMessenger" },
  "0xfd78ee919681417d192449715b2594ab58f5d002": { pt: "CCTP TokenMinter", en: "CCTP TokenMinter" },
  "0x6b0a44c64190279f7034b77c13a566e914fe5ec4": { pt: "Faroo stPROS", en: "Faroo stPROS" },
  "0xec47e6f3ef1e7bc8e00f670ac3d5016798fe44d0": { pt: "Harbor APC3M", en: "Harbor APC3M" },
  "0xd0428799fbc35557834d33121ba4472692c8908a": { pt: "Harbor Axil Prime vault", en: "Harbor Axil Prime vault" },
  "0x13282289b8b241cf16eb5b8bad401c7c2fdab0f8": { pt: "Harbor Axil Pot APT", en: "Harbor Axil Pot APT" },
  "0x047cd0a91e9b92ed979189a6c8a120bf280f02e5": { pt: "Morpho mmUSDC", en: "Morpho mmUSDC" },
  "0x15c25ed222fc498f672af5c3adb5ed0a96e1aff1": { pt: "Morpho SharpByte USDC", en: "Morpho SharpByte USDC" },
};

const FAROSWAP = "0xa5ca5fbe34e444f366b373170541ec6902b0f75c";
const JUMPER = new Set([
  "0xff70f4a1d11995621854f3692acf286d8acd04b2",
  "0x36c800d4472fbb888d034aa74778f481aee01fec",
]);
const CCTP_A = "0x28b5a0e9c621a5badaa536219b3a228c8168cf5d";
const CCTP_B = "0xfd78ee919681417d192449715b2594ab58f5d002";

export function venueTag(address) {
  const k = String(address || "").toLowerCase();
  if (k === FAROSWAP) return "faroswap";
  if (JUMPER.has(k)) return "jumper";
  if (k === CCTP_A || k === CCTP_B) return "cctp";
  if (k === PACIFIC.WPROS.address.toLowerCase()) return "wrap";
  return null;
}

export const PROTOCOL_SPENDERS = [
  { id: "faroswap", address: getAddress("0xA5cA5Fbe34e444F366B373170541ec6902b0F75c"), en: "FaroSwap router", pt: "FaroSwap router" },
  { id: "faroswap", address: getAddress("0xbf105f4ffbd3825f5433d074008b9a76237d849c"), en: "FaroSwap DODO Approve", pt: "FaroSwap DODO Approve" },
  { id: "faroswap", address: getAddress("0xc0479219f4feba5a668cff71bf96f4ffe124c3ab"), en: "FaroSwap V3 NPM", pt: "FaroSwap V3 NPM" },
  { id: "jumper", address: getAddress("0xFf70F4A1d11995621854F3692acF286d8aCd04b2"), en: "Jumper (LI.FI Diamond)", pt: "Jumper (LI.FI Diamond)" },
  { id: "jumper", address: getAddress("0x36C800D4472fBb888D034Aa74778f481aEE01FEc"), en: "Jumper (LI.FI Permit2)", pt: "Jumper (LI.FI Permit2)" },
  { id: "cctp", address: getAddress("0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d"), en: "CCTP TokenMessenger", pt: "CCTP TokenMessenger" },
  { id: "faroo", address: getAddress("0x6b0a44c64190279f7034b77c13a566e914fe5ec4"), en: "Faroo stPROS", pt: "Faroo stPROS" },
  { id: "harbor", address: getAddress("0xD0428799FbC35557834d33121BA4472692c8908a"), en: "Harbor Axil Prime vault", pt: "Harbor Axil Prime vault" },
  { id: "harbor", address: getAddress("0x13282289b8B241Cf16eB5B8Bad401C7c2fdAb0F8"), en: "Harbor Axil Pot", pt: "Harbor Axil Pot" },
  { id: "morpho", address: getAddress("0x047cD0a91E9B92ED979189a6C8A120bf280f02E5"), en: "Morpho mmUSDC", pt: "Morpho mmUSDC" },
  { id: "morpho", address: getAddress("0x15c25ED222fc498f672af5c3adb5ED0a96E1AFf1"), en: "Morpho SharpByte USDC", pt: "Morpho SharpByte USDC" },
  { id: "termmax", address: getAddress("0x3a5fA6c3B435606F868810c37Bd008a5b64Fa51e"), en: "TermMax tmseUSDC", pt: "TermMax tmseUSDC" },
  { id: "prosper", address: getAddress("0xEfdbb0eA7647B0e21AEf7A3b7a5D6A632c3116C8"), en: "Prosper factory", pt: "Prosper factory" },
  { id: "prosper", address: getAddress("0xbbDDb34955ed0DD8059188aA57422f29babCe6ec"), en: "Prosper deposit router", pt: "Prosper deposit router" },
];

/** Share tokens / ERC-4626 vaults with a verified Pacific address. */
export const PROTOCOL_VAULTS = [
  { id: "faroo-stpros", protocol: "faroo", symbol: "stPROS", en: "Faroo liquid staking", pt: "Faroo liquid staking", share: getAddress("0x6b0a44c64190279f7034b77c13a566e914fe5ec4"), convert: getAddress("0x6b0a44c64190279f7034b77c13a566e914fe5ec4"), decimals: 18, asset: "WPROS", assetDecimals: 18 },
  { id: "faroo-frhv001", protocol: "faroo", symbol: "FRHV001", en: "Faroo RWA Hybrid Vault", pt: "Faroo RWA Hybrid Vault", share: getAddress("0x36f3d19dda7ed1428e3014ae6f2a75d70393b7e6"), convert: getAddress("0x36f3d19dda7ed1428e3014ae6f2a75d70393b7e6"), decimals: 24, asset: "stPROS", assetDecimals: 18 },
  { id: "faroo-fyv001", protocol: "faroo", symbol: "FYV001", en: "Faroo Yield Vault 001", pt: "Faroo Yield Vault 001", share: getAddress("0xc775dfaa7565f2aca5ddf5dd6837ceb846de591b"), convert: getAddress("0xc775dfaa7565f2aca5ddf5dd6837ceb846de591b"), decimals: 24, asset: "stPROS", assetDecimals: 18 },
  { id: "harbor-apc3m", protocol: "harbor", symbol: "APC3M", en: "Harbor / R25 Axil Prime 3M", pt: "Harbor / R25 Axil Prime 3M", share: getAddress("0xEC47E6f3EF1E7bc8e00F670aC3d5016798Fe44d0"), convert: getAddress("0xD0428799FbC35557834d33121BA4472692c8908a"), decimals: 18, asset: "USDC", assetDecimals: 6 },
  { id: "harbor-apt", protocol: "harbor", symbol: "APT", en: "Harbor / R25 Axil Pot", pt: "Harbor / R25 Axil Pot", share: getAddress("0x13282289b8B241Cf16eB5B8Bad401C7c2fdAb0F8"), convert: getAddress("0x13282289b8B241Cf16eB5B8Bad401C7c2fdAb0F8"), decimals: 18, asset: "USDC", assetDecimals: 6 },
  { id: "morpho-mmusdc", protocol: "morpho", symbol: "mmUSDC", en: "Morpho RockawayX USDC V2", pt: "Morpho RockawayX USDC V2", share: getAddress("0x047cD0a91E9B92ED979189a6C8A120bf280f02E5"), convert: getAddress("0x047cD0a91E9B92ED979189a6C8A120bf280f02E5"), decimals: 18, asset: "USDC", assetDecimals: 6 },
  { id: "morpho-sbusdc", protocol: "morpho", symbol: "sbUSDC-ph-eco", en: "Morpho SharpByte USDC", pt: "Morpho SharpByte USDC", share: getAddress("0x15c25ED222fc498f672af5c3adb5ED0a96E1AFf1"), convert: getAddress("0x15c25ED222fc498f672af5c3adb5ED0a96E1AFf1"), decimals: 18, asset: "USDC", assetDecimals: 6 },
  { id: "termmax-tmseusdc", protocol: "termmax", symbol: "tmseUSDC", en: "TermMax Stable ERC4626 USDC", pt: "TermMax Stable ERC4626 USDC", share: getAddress("0x3a5fA6c3B435606F868810c37Bd008a5b64Fa51e"), convert: getAddress("0x3a5fA6c3B435606F868810c37Bd008a5b64Fa51e"), decimals: 6, asset: "USDC", assetDecimals: 6 },
  { id: "termmax-sbprime", protocol: "termmax", symbol: "sbPharosPrime", en: "TermMax / SharpByte Pharos Prime", pt: "TermMax / SharpByte Pharos Prime", share: getAddress("0x697322F0bB715fc1e4C1f1283a9F8e546Cb4a342"), convert: getAddress("0x697322F0bB715fc1e4C1f1283a9F8e546Cb4a342"), decimals: 6, asset: "USDC", assetDecimals: 6 },
];

export const UNREAD_PROTOCOLS = [
  { id: "zona", en: "Zona", pt: "Zona", reasonEn: "Zona is on the Port ecosystem list, but the published Zona contract page is Robinhood Chain, not a Pacific vault I can eth_call.", reasonPt: "Zona está no Ecosystem do Port, mas a página oficial de contratos é Robinhood Chain, não um vault da Pacific para eth_call." },
  { id: "ember", en: "Ember", pt: "Ember", reasonEn: "Ember pALPHA is documented on Ethereum. I will not use that 0x as a Pacific share token.", reasonPt: "Ember pALPHA está documentado na Ethereum. Não uso esse 0x como share da Pacific." },
  { id: "harbor-rest", en: "other Harbor cards", pt: "outros cards do Harbor", reasonEn: "Harbor catalog cards without a Pacific share I can cite: pGAIN, ETHvp, BTCvc, pRNH, BTCvp, bfBTC, GPCI, pALPHA, VRPC-Daily, VRPC-SemiYearly, tulPRWA. RockawayX-USDC is the Morpho mmUSDC vault. I will not copy Port APY numbers.", reasonPt: "Cards do Harbor sem share da Pacific que eu cite: pGAIN, ETHvp, BTCvc, pRNH, BTCvp, bfBTC, GPCI, pALPHA, VRPC-Daily, VRPC-SemiYearly, tulPRWA. RockawayX-USDC é o vault Morpho mmUSDC. Não copio APY do Port." },
  { id: "asseto", en: "Asseto", pt: "Asseto", reasonEn: "Asseto is on the Port list. The public site has no Pacific share token I can eth_call.", reasonPt: "Asseto está no Port. O site público não mostra share token da Pacific para eth_call." },
  { id: "agra", en: "Agra", pt: "Agra", reasonEn: "Agra lists wmtUSDC as a Wildcat credit bond. I will not guess a Pacific 0x from a truncated explorer link.", reasonPt: "Agra lista wmtUSDC como bond Wildcat. Não invento 0x da Pacific a partir de um link truncado." },
  { id: "oku", en: "OKU", pt: "OKU", reasonEn: "OKU is an aggregator UI. I read Morpho and FaroSwap on-chain, not OKU itself.", reasonPt: "OKU é uma UI agregadora. Eu leio Morpho e FaroSwap on-chain, não a OKU." },
  { id: "newsight", en: "NewSight", pt: "NewSight", reasonEn: "NewSight is a prediction market. No Pacific position token is published for this page.", reasonPt: "NewSight é prediction market. Não há token de posição da Pacific publicado para esta página." },
  { id: "grandline", en: "Grandline", pt: "Grandline", reasonEn: "Grandline is NFT. This page does not invent an NFT contract to scan.", reasonPt: "Grandline é NFT. Esta página não inventa um contrato NFT para varrer." },
  { id: "pns", en: "PNS", pt: "PNS", reasonEn: "PNS is a name service, not a yield vault.", reasonPt: "PNS é serviço de nome, não um vault de yield." },
  { id: "zns", en: "ZNS Connect", pt: "ZNS Connect", reasonEn: "ZNS Connect is identity / domains, not a wallet position I can value.", reasonPt: "ZNS Connect é identidade / domínio, não uma posição de carteira que eu valorize." },
  { id: "interport", en: "InterPort", pt: "InterPort", reasonEn: "InterPort is a bridge. No Pacific allowance target is in this build yet.", reasonPt: "InterPort é bridge. Ainda não há spender da Pacific neste build." },
  { id: "layerzero", en: "LayerZero", pt: "LayerZero", reasonEn: "LayerZero is messaging infra, not a wallet vault.", reasonPt: "LayerZero é infra de mensagens, não um vault da carteira." },
  { id: "bifrost", en: "Bifrost", pt: "Bifrost", reasonEn: "Bifrost is Coming Soon on Port. Faroo stPROS is the Pacific LST I can read.", reasonPt: "Bifrost está Coming Soon no Port. Faroo stPROS é o LST da Pacific que eu leio." },
];

export const DEMO_WALLET = "0x912c9aDe24D44d8922f0866D8Dcb079f1363f647";

export function tokenByAddress(address) {
  if (!address) return null;
  const key = address.toLowerCase();
  return TOKEN_LIST.find((t) => t.address.toLowerCase() === key)
    ?? Object.values(EXTRA_TOKENS).find((t) => t.address.toLowerCase() === key)
    ?? PROTOCOL_VAULTS.find((t) => t.share.toLowerCase() === key)
    ?? null;
}
