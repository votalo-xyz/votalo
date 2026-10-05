/**
 * Where reads come from. With `NEXT_PUBLIC_ENVIO_GRAPHQL_URL` set, screens read the indexer and the
 * actions send real signed requests to the relay. Without it, the screens run on local example data.
 */
export const GRAPHQL_URL = process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_URL ?? "";
export const isLive = GRAPHQL_URL !== "";
