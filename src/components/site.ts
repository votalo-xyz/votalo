import { monadTestnet, VOTALO_ADDRESS } from "@/lib/chain/config";

export const GITHUB_URL = "https://github.com/votalo-xyz/votalo";
export const DOCS_URL = `${GITHUB_URL}/tree/main/docs`;
export const CONTRACT_ADDRESS = VOTALO_ADDRESS;
export const CONTRACT_URL = `${monadTestnet.blockExplorers.default.url}/address/${VOTALO_ADDRESS}`;
export const MONAD_URL = "https://www.monad.xyz";

// Pitch deck sources: each claim on a slide links to one of these.
export const MONAD_DOCS_URL = "https://docs.monad.xyz";
export const LICENSE_URL = `${GITHUB_URL}/blob/main/LICENSE`;
export const CI_URL = `${GITHUB_URL}/actions/workflows/ci.yml`;
export const CONTRACT_TESTS_URL = `${GITHUB_URL}/blob/main/contracts/test/Votalo.t.sol`;
export const CONTRACT_SOURCE_URL = `${GITHUB_URL}/tree/main/contracts/src`;
export const INDEXER_URL = `${GITHUB_URL}/tree/main/indexer`;
export const SIGNING_CODE_URL = `${GITHUB_URL}/blob/main/src/lib/chain/typedData.ts`;
export const WIDGET_DOC_URL = `${GITHUB_URL}/blob/main/docs/DECISIONS.md#embeddable-widget-and-framing-policy-2026-10-05`;
export const MERA_URL = "https://www.npmjs.com/package/@category-labs/mera";
export const WEBAUTHN_PRF_URL = "https://www.w3.org/TR/webauthn-3/#prf-extension";
