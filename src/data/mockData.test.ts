import { Category, Spot, User } from "./mockData";

describe("shared data contracts", () => {
  it("accepts the supported category and visibility values used by pins", () => {
    const spot: Spot = {
      id: "spot-1", name: "Test place", category: "Coffee" as Category,
      latitude: 51.5, longitude: -0.1, address: "London", rating: 5,
      personalRating: 5, description: "Test", note: "Test", visibility: "friends",
      pinnedBy: "@tester", ownerType: "current-user",
    };
    expect(spot.visibility).toBe("friends");
    expect(spot.personalRating).toBeGreaterThanOrEqual(1);
  });

  it("keeps account identifiers needed by API-authenticated screens", () => {
    const user: User = { id: "user-1", name: "Test User", username: "tester", handle: "@tester", email: "test@example.com" };
    expect(user.handle).toBe(`@${user.username}`);
  });
});
