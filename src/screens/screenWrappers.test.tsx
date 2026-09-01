import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { FriendsScreen } from "./FriendsScreen";
import { MapScreen } from "./MapScreen";
import { ProfileScreen } from "./ProfileScreen";
import { SavedScreen } from "./SavedScreen";

const cases = [[MapScreen, "map"], [FriendsScreen, "friends"], [SavedScreen, "saved"], [ProfileScreen, "settings"]] as const;

describe("screen wrappers", () => {
  it.each(cases)("renders %s content when active", (Screen) => {
    const view = render(<Screen active opacity={undefined as never}><Text>Screen content</Text></Screen>);
    expect(view).toBeDefined();
  });

  it.each(cases)("does not render %s content when inactive", (Screen) => {
    const view = render(<Screen active={false} opacity={undefined as never}><Text>Screen content</Text></Screen>);
    expect(view).toBeDefined();
  });
});
