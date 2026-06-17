import { getCachedForecast, jsonResponse } from "./_energyShared";

export const config = {
  runtime: "edge",
};

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const hours = Number(url.searchParams.get("hours") ?? 24);
    return jsonResponse(await getCachedForecast(hours));
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unknown forecast aggregation error",
      },
      502,
    );
  }
}
