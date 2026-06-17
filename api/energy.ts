import { getCachedEnergySnapshot, jsonResponse } from "./_energyShared";

export const config = {
  runtime: "edge",
};

export default async function handler() {
  try {
    return jsonResponse(await getCachedEnergySnapshot());
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unknown energy aggregation error",
      },
      502,
    );
  }
}
