export interface Checkpoint {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  obligatorio: boolean; // mandatory flag (Spanish)
  status?: string; // optional status for UI markers
  notes?: string;
}

export interface RouteStats {
  totalDistanceKm: number;
  estimatedTimeMinutes: number;
}

/**
 * Service to handle coordinate conversions, distance calculations, and route optimizations for Google Maps.
 */
export const mapService = {
  /**
   * Calculates the Haversine distance between two coordinates in kilometers.
   */
  calculateHaversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  },

  /**
   * Calculates the overall route distance and estimated cleaning time (driving + work).
   * Assumes an average speed of 40 km/h and 30 mins cleaning time per checkpoint.
   */
  calculateRouteStats(checkpoints: Checkpoint[]): RouteStats {
    if (checkpoints.length <= 1) {
      return { totalDistanceKm: 0, estimatedTimeMinutes: checkpoints.length * 30 };
    }

    let totalDistance = 0;
    for (let i = 0; i < checkpoints.length - 1; i++) {
      const current = checkpoints[i];
      const next = checkpoints[i + 1];
      totalDistance += this.calculateHaversineDistance(
        current.lat,
        current.lng,
        next.lat,
        next.lng
      );
    }

    // Average driving speed is 40km/h => 1.5 mins per km
    const drivingTime = totalDistance * 1.5;
    // 30 mins spent at each checkpoint doing clean service
    const cleaningTime = checkpoints.length * 30;

    return {
      totalDistanceKm: parseFloat(totalDistance.toFixed(2)),
      estimatedTimeMinutes: Math.round(drivingTime + cleaningTime),
    };
  },

  /**
   * Optimizes the checkpoints route ordering using a Greedy Nearest Neighbor (TSP) algorithm.
   * Starts from the first element as the origin (depot) and sorts remaining nodes by proximity.
   */
  optimizeRoute(checkpoints: Checkpoint[]): Checkpoint[] {
    if (checkpoints.length <= 2) return [...checkpoints];

    const unvisited = [...checkpoints];
    const optimized: Checkpoint[] = [];

    // Start with the first element (e.g., dispatch depot / starting home base)
    const first = unvisited.shift()!;
    optimized.push(first);

    let current = first;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = this.calculateHaversineDistance(
          current.lat,
          current.lng,
          unvisited[i].lat,
          unvisited[i].lng
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }

      current = unvisited.splice(nearestIndex, 1)[0];
      optimized.push(current);
    }

    return optimized;
  },
};
