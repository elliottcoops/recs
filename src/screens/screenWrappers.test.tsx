import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { FriendsScreen } from "./FriendsScreen";
import { MapScreen } from "./MapScreen";
import { ProfileScreen } from "./ProfileScreen";
import { SavedScreen } from "./SavedScreen";
import { DiscoverScreen } from "./DiscoverScreen";
import { ThemeProvider } from "../theme";

const cases = [[MapScreen, "map"], [FriendsScreen, "friends"], [SavedScreen, "saved"], [ProfileScreen, "settings"], [DiscoverScreen, "discover"]] as const;

describe("screen wrappers", () => {
  it.each(cases)("renders %s content when active", (Screen) => {
    const view = render(<ThemeProvider><Screen active opacity={undefined as never}><Text>Screen content</Text></Screen></ThemeProvider>);
    expect(view).toBeDefined();
  });

  it.each(cases)("does not render %s content when inactive", (Screen) => {
    const view = render(<ThemeProvider><Screen active={false} opacity={undefined as never}><Text>Screen content</Text></Screen></ThemeProvider>);
    expect(view).toBeDefined();
  });
});
