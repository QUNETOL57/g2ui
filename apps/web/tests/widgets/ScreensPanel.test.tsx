import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { ScreensPanel } from "@widgets/screens-panel/ScreensPanel";

import {
  makeFixtureProject,
  makeLabel,
  makeSecondScreen,
  withChildren,
  withScreens,
} from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

beforeEach(() => {
  resetEditorStore();
  vi.useRealTimers();
});

function renderPanel(props: { collapsed?: boolean; onToggleCollapse?: () => void } = {}) {
  return render(<ScreensPanel {...props} />);
}

describe("ScreensPanel rendering", () => {
  it("renders section title and all screens with name and id", () => {
    const project = withScreens(makeFixtureProject(), [
      makeFixtureProject().screens[0],
      makeSecondScreen("screen_other", "Settings"),
    ]);
    get().setProject(project);
    renderPanel();

    expect(screen.getByText("Screens")).toBeInTheDocument();
    const cards = screen.getAllByTestId("screen-card");
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText("Main")).toBeInTheDocument();
    expect(within(cards[0]).getByText("screen_main")).toBeInTheDocument();
    expect(within(cards[1]).getByText("Settings")).toBeInTheDocument();
    expect(within(cards[1]).getByText("screen_other")).toBeInTheDocument();
  });

  it("renders a preview container for each screen", () => {
    const project = withScreens(makeFixtureProject(), [
      makeFixtureProject().screens[0],
      makeSecondScreen(),
    ]);
    get().setProject(project);
    renderPanel();
    expect(screen.getAllByTestId("screen-card-preview")).toHaveLength(2);
  });

  it("highlights the active screen card", () => {
    const project = withScreens(makeFixtureProject(), [
      makeFixtureProject().screens[0],
      makeSecondScreen("screen_other", "Other"),
    ]);
    get().setProject(project);
    get().setActiveScreen("screen_other");
    renderPanel();

    const active = screen
      .getAllByTestId("screen-card")
      .find((el) => el.dataset.screenId === "screen_other");
    expect(active).toBeTruthy();
    expect(active).toHaveAttribute("aria-current", "true");
  });
});

describe("ScreensPanel interactions", () => {
  it("switches active screen when a card is clicked", async () => {
    const project = withScreens(makeFixtureProject(), [
      makeFixtureProject().screens[0],
      makeSecondScreen("screen_other", "Other"),
    ]);
    get().setProject(project);
    renderPanel();

    const otherCard = screen.getAllByTestId("screen-card").find((el) => el.dataset.screenId === "screen_other")!;
    await userEvent.click(otherCard);
    expect(get().activeScreenId).toBe("screen_other");
  });

  it("creates a new screen via add button", async () => {
    renderPanel();
    const before = get().project.screens.length;
    await userEvent.click(screen.getByTestId("screens-panel-add"));
    expect(get().project.screens.length).toBe(before + 1);
  });

  it("activates the newly added screen and shows its default name", async () => {
    renderPanel();

    await userEvent.click(screen.getByTestId("screens-panel-add"));

    const added = get().project.screens.at(-1);
    expect(added?.name).toBe("Screen 2");
    expect(get().activeScreenId).toBe(added?.id);
    expect(screen.getByText("Screen 2")).toBeInTheDocument();
    expect(
      screen.getAllByTestId("screen-card").find((card) => card.dataset.screenId === added?.id),
    ).toHaveAttribute("aria-current", "true");
  });

  it("duplicates a screen via duplicate button", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    renderPanel();

    const card = screen.getByTestId("screen-card");
    await userEvent.click(within(card).getByTestId("screen-card-duplicate"));
    expect(get().project.screens.length).toBe(2);
    const copy = get().project.screens[1];
    expect(copy.children?.[0]?.id).not.toBe("lbl_1");
  });

  it("activates duplicated screen and shows copy suffix in the card title", async () => {
    renderPanel();

    const card = screen.getByTestId("screen-card");
    await userEvent.click(within(card).getByTestId("screen-card-duplicate"));

    const copy = get().project.screens[1];
    expect(get().activeScreenId).toBe(copy.id);
    expect(screen.getByText("Main copy")).toBeInTheDocument();
    expect(
      screen.getAllByTestId("screen-card").find((item) => item.dataset.screenId === copy.id),
    ).toHaveAttribute("aria-current", "true");
  });

  it("deletes a screen when more than one exists", async () => {
    const project = withScreens(makeFixtureProject(), [
      makeFixtureProject().screens[0],
      makeSecondScreen("screen_other", "Other"),
    ]);
    get().setProject(project);
    renderPanel();

    const otherCard = screen.getAllByTestId("screen-card").find((el) => el.dataset.screenId === "screen_other")!;
    await userEvent.click(within(otherCard).getByTestId("screen-card-delete"));
    expect(get().project.screens).toHaveLength(1);
    expect(get().project.screens[0].id).toBe("screen_main");
  });

  it("switches active screen when the active card is deleted", async () => {
    const project = withScreens(makeFixtureProject(), [
      makeFixtureProject().screens[0],
      makeSecondScreen("screen_other", "Other"),
    ]);
    get().setProject(project);
    get().setActiveScreen("screen_other");
    renderPanel();

    const activeCard = screen
      .getAllByTestId("screen-card")
      .find((card) => card.dataset.screenId === "screen_other")!;
    await userEvent.click(within(activeCard).getByTestId("screen-card-delete"));

    expect(get().activeScreenId).toBe("screen_main");
    expect(
      screen.getAllByTestId("screen-card").find((card) => card.dataset.screenId === "screen_main"),
    ).toHaveAttribute("aria-current", "true");
  });

  it("disables delete when only one screen remains", () => {
    renderPanel();
    const deleteBtn = within(screen.getByTestId("screen-card")).getByTestId("screen-card-delete");
    expect(deleteBtn).toBeDisabled();
  });

  it("renders screens in project order after moveScreen", () => {
    const project = withScreens(makeFixtureProject(), [
      makeSecondScreen("screen_a", "A"),
      makeSecondScreen("screen_b", "B"),
      makeSecondScreen("screen_c", "C"),
    ]);
    get().setProject(project);
    renderPanel();

    act(() => {
      get().moveScreen("screen_c", 0);
    });
    const cards = screen.getAllByTestId("screen-card");
    expect(cards.map((card) => card.dataset.screenId)).toEqual([
      "screen_c",
      "screen_a",
      "screen_b",
    ]);
  });

  it("marks screen cards as draggable for reordering", () => {
    const project = withScreens(makeFixtureProject(), [
      makeFixtureProject().screens[0],
      makeSecondScreen(),
    ]);
    get().setProject(project);
    renderPanel();
    for (const card of screen.getAllByTestId("screen-card")) {
      expect(card).toHaveAttribute("draggable", "true");
    }
  });

  it("reorders screens via drag and drop", () => {
    const project = withScreens(makeFixtureProject(), [
      makeSecondScreen("screen_a", "A"),
      makeSecondScreen("screen_b", "B"),
      makeSecondScreen("screen_c", "C"),
    ]);
    get().setProject(project);
    renderPanel();

    const cards = screen.getAllByTestId("screen-card");
    const source = cards.find((el) => el.dataset.screenId === "screen_a")!;
    const target = cards.find((el) => el.dataset.screenId === "screen_c")!;

    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      top: 100,
      left: 0,
      right: 200,
      bottom: 200,
      width: 200,
      height: 100,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect);

    const dataTransfer = {
      effectAllowed: "move",
      dropEffect: "move",
      data: new Map<string, string>(),
      setData(type: string, value: string) {
        this.data.set(type, value);
      },
      getData(type: string) {
        return this.data.get(type) ?? "";
      },
    };
    dataTransfer.setData("text/plain", "screen_a");
    act(() => {
      fireEvent.dragStart(source, { dataTransfer });
      fireEvent.dragOver(target, { clientY: 160, dataTransfer });
      fireEvent.drop(target, { clientY: 160, dataTransfer });
    });

    expect(get().project.screens.map((s) => s.id)).toEqual(["screen_b", "screen_c", "screen_a"]);
  });
});

describe("ScreensPanel collapse", () => {
  it("hides the list when collapsed", () => {
    renderPanel({ collapsed: true });
    expect(screen.queryByTestId("screens-panel-list")).not.toBeInTheDocument();
    expect(screen.getByText("Screens")).toBeInTheDocument();
  });

  it("calls onToggleCollapse when collapse button is clicked", async () => {
    const toggle = vi.fn();
    renderPanel({ collapsed: false, onToggleCollapse: toggle });
    await userEvent.click(screen.getByTestId("screens-panel-collapse"));
    expect(toggle).toHaveBeenCalled();
  });
});

