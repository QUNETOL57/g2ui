import { describe, expect, it } from "vitest";
import type { WidgetNode } from "@entities/ui-project";
import { layoutTree } from "@entities/ui-project/lib/layoutEngine";
import { computeWidgetStackIndices } from "@widgets/canvas-workspace/lib/widgetStackIndices";
import {
  makeButton,
  makeFixtureProject,
  makeIcon,
  makeLabel,
  makeLine,
  makePanel,
  makeRect,
  withChildren,
} from "../fixtures/projects";

function indicesFor(children: WidgetNode[]) {
  const project = withChildren(makeFixtureProject(), children);
  const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
  return { map: computeWidgetStackIndices(layout), layout, project };
}

function z(map: ReadonlyMap<string, number>, id: string) {
  const value = map.get(id);
  expect(value, `missing z-index for ${id}`).toBeDefined();
  return Number(value);
}

function expectHigherThan(map: ReadonlyMap<string, number>, higherId: string, lowerId: string) {
  expect(z(map, higherId)).toBeGreaterThan(z(map, lowerId));
}

/** ids[0] is the highest row in the widget tree and must have the highest z-index. */
function expectTreeOrder(map: ReadonlyMap<string, number>, ids: string[]) {
  for (let i = 0; i < ids.length - 1; i += 1) {
    expectHigherThan(map, ids[i], ids[i + 1]);
  }
}

function expectPanelBelowChildren(
  map: ReadonlyMap<string, number>,
  panelId: string,
  childIds: string[],
) {
  const panelZ = z(map, panelId);
  for (const childId of childIds) {
    expect(z(map, childId)).toBeGreaterThan(panelZ);
  }
}

function expectSubtreeBelow(
  map: ReadonlyMap<string, number>,
  topId: string,
  descendantIds: string[],
) {
  const topZ = z(map, topId);
  for (const id of descendantIds) {
    expect(z(map, id)).toBeLessThan(topZ);
  }
}

describe("computeWidgetStackIndices", () => {
  describe("baseline", () => {
    it("returns an empty map for a screen with no widgets", () => {
      const { map } = indicesFor([]);
      expect(map.size).toBe(0);
    });

    it("assigns z-index starting at 1 for a single screen widget", () => {
      const { map } = indicesFor([makeLabel("lbl_1")]);
      expect(map.get("lbl_1")).toBe(1);
    });

    it("assigns a unique z-index to every layer node", () => {
      const panel = makePanel("pan_1", [
        makeLabel("lbl_a", "A"),
        makeIcon("ico_1"),
        makeButton("btn_1", "Tap"),
      ]);
      const { map } = indicesFor([makeLabel("lbl_top"), panel, makeRect("rec_1")]);

      const values = [...map.values()];
      expect(values.length).toBe(map.size);
      expect(new Set(values).size).toBe(values.length);
      expect(Math.min(...values)).toBeGreaterThanOrEqual(1);
    });
  });

  describe("screen-level siblings", () => {
    it("gives earlier screen siblings a higher z-index than later ones", () => {
      const { map } = indicesFor([makePanel("pan_1"), makeLabel("lbl_1", "Under")]);
      expectHigherThan(map, "pan_1", "lbl_1");
    });

    it("orders three screen siblings strictly by tree position", () => {
      const { map } = indicesFor([
        makeLabel("lbl_top"),
        makeRect("rec_mid"),
        makeButton("btn_bottom", "Tap"),
      ]);
      expectTreeOrder(map, ["lbl_top", "rec_mid", "btn_bottom"]);
    });

    it("orders four mixed screen widgets by tree position", () => {
      const { map } = indicesFor([
        makeIcon("ico_1"),
        makeLine("ln_1"),
        makePanel("pan_1"),
        makeLabel("lbl_1"),
      ]);
      expectTreeOrder(map, ["ico_1", "ln_1", "pan_1", "lbl_1"]);
    });

    it("keeps a higher screen sibling above an entire lower panel subtree", () => {
      const panel = makePanel("pan_1", [
        makeLabel("lbl_in_1", "In 1"),
        makeLabel("lbl_in_2", "In 2"),
      ]);
      const { map } = indicesFor([makeLabel("lbl_1", "Above"), panel]);

      expectHigherThan(map, "lbl_1", "pan_1");
      expectHigherThan(map, "lbl_1", "lbl_in_1");
      expectHigherThan(map, "lbl_1", "lbl_in_2");
    });

    it("keeps a lower screen sibling below an entire higher panel subtree", () => {
      const panel = makePanel("pan_1", [
        makeLabel("lbl_in_1", "In 1"),
        makeIcon("ico_in"),
      ]);
      const { map } = indicesFor([panel, makeButton("btn_under", "Under")]);

      expectHigherThan(map, "lbl_in_1", "btn_under");
      expectHigherThan(map, "ico_in", "btn_under");
      expectHigherThan(map, "pan_1", "btn_under");
    });

    it("sandwiches a panel subtree between higher and lower screen siblings", () => {
      const panel = makePanel("pan_1", [makeLabel("lbl_in", "Inside")]);
      const { map } = indicesFor([
        makeLabel("lbl_above"),
        panel,
        makeRect("rec_below"),
      ]);

      expectTreeOrder(map, ["lbl_above", "lbl_in", "pan_1", "rec_below"]);
      expectHigherThan(map, "lbl_above", "lbl_in");
      expectHigherThan(map, "lbl_in", "rec_below");
    });
  });

  describe("panels without children", () => {
    it("treats an empty panel like a regular leaf at screen level", () => {
      const { map } = indicesFor([makePanel("pan_1"), makeLabel("lbl_1")]);
      expectHigherThan(map, "pan_1", "lbl_1");
    });

    it("orders two empty panels by tree position", () => {
      const { map } = indicesFor([makePanel("pan_top"), makePanel("pan_bottom")]);
      expectHigherThan(map, "pan_top", "pan_bottom");
    });
  });

  describe("panel children", () => {
    it("keeps a panel below every widget inside it", () => {
      const panel = makePanel("pan_1", [
        makeLabel("lbl_top", "Top"),
        makeLabel("lbl_bottom", "Bottom"),
      ]);
      const { map } = indicesFor([panel]);

      expectPanelBelowChildren(map, "pan_1", ["lbl_top", "lbl_bottom"]);
    });

    it("orders panel children by tree position: higher in the list gets a higher z-index", () => {
      const panel = makePanel("pan_1", [
        makeLabel("lbl_top", "Top"),
        makeLabel("lbl_bottom", "Bottom"),
      ]);
      const { map } = indicesFor([panel]);

      expectHigherThan(map, "lbl_top", "lbl_bottom");
    });

    it("keeps a panel below a single child", () => {
      const panel = makePanel("pan_1", [makeLabel("lbl_only", "Only")]);
      const { map } = indicesFor([panel]);
      expectHigherThan(map, "lbl_only", "pan_1");
    });

    it("orders many panel children strictly by tree position", () => {
      const panel = makePanel("pan_1", [
        makeIcon("ico_1"),
        makeIcon("ico_2"),
        makeIcon("ico_3"),
        makeIcon("ico_4"),
      ]);
      const { map } = indicesFor([panel]);

      expectPanelBelowChildren(map, "pan_1", ["ico_1", "ico_2", "ico_3", "ico_4"]);
      expectTreeOrder(map, ["ico_1", "ico_2", "ico_3", "ico_4", "pan_1"]);
    });

    it("applies the same rules to mixed widget types inside a panel", () => {
      const panel = makePanel("pan_1", [
        makeButton("btn_1", "Tap"),
        makeRect("rec_1"),
        makeLine("ln_1"),
        makeIcon("ico_1"),
      ]);
      const { map } = indicesFor([panel]);

      expectPanelBelowChildren(map, "pan_1", ["btn_1", "rec_1", "ln_1", "ico_1"]);
      expectTreeOrder(map, ["btn_1", "rec_1", "ln_1", "ico_1", "pan_1"]);
    });
  });

  describe("nested panels", () => {
    it("keeps an inner panel above the outer panel but below its own children", () => {
      const inner = makePanel("pan_inner", [makeLabel("lbl_deep", "Deep")]);
      const outer = makePanel("pan_outer", [inner, makeIcon("ico_sibling")]);
      const { map } = indicesFor([outer]);

      expectHigherThan(map, "pan_inner", "pan_outer");
      expectHigherThan(map, "lbl_deep", "pan_inner");
      expectHigherThan(map, "pan_inner", "ico_sibling");
      expectHigherThan(map, "ico_sibling", "pan_outer");
      expectTreeOrder(map, ["lbl_deep", "pan_inner", "ico_sibling", "pan_outer"]);
    });

    it("orders nested panel children independently at each level", () => {
      const innerTop = makePanel("pan_inner_top", [makeLabel("lbl_deep")]);
      const innerBottom = makePanel("pan_inner_bottom", [makeButton("btn_deep", "Tap")]);
      const outer = makePanel("pan_outer", [innerTop, innerBottom]);
      const { map } = indicesFor([outer]);

      expectHigherThan(map, "pan_inner_top", "pan_inner_bottom");
      expectHigherThan(map, "lbl_deep", "pan_inner_top");
      expectHigherThan(map, "btn_deep", "pan_inner_bottom");
      expectHigherThan(map, "pan_inner_top", "pan_outer");
      expectHigherThan(map, "pan_inner_bottom", "pan_outer");
    });

    it("keeps a screen sibling above a deeply nested descendant", () => {
      const deep = makePanel("pan_l3", [makeLabel("lbl_deep")]);
      const mid = makePanel("pan_l2", [deep]);
      const outer = makePanel("pan_l1", [mid]);
      const { map } = indicesFor([makeLabel("lbl_screen"), outer]);

      expectHigherThan(map, "lbl_screen", "pan_l1");
      expectHigherThan(map, "lbl_screen", "pan_l2");
      expectHigherThan(map, "lbl_screen", "pan_l3");
      expectHigherThan(map, "lbl_screen", "lbl_deep");
    });

    it("assigns exact z-index values for a known nested structure", () => {
      const inner = makePanel("pan_inner", [
        makeLabel("lbl_a"),
        makeLabel("lbl_b"),
      ]);
      const outer = makePanel("pan_outer", [inner, makeIcon("ico_1")]);
      const { map } = indicesFor([makeLabel("lbl_screen"), outer, makeRect("rec_tail")]);

      expect(Object.fromEntries(map)).toEqual({
        lbl_screen: 7,
        pan_outer: 2,
        ico_1: 3,
        pan_inner: 4,
        lbl_b: 5,
        lbl_a: 6,
        rec_tail: 1,
      });
    });
  });

  describe("competing panel subtrees at screen level", () => {
    it("keeps the first panel subtree entirely above the second panel subtree", () => {
      const panelTop = makePanel("pan_top", [
        makeLabel("lbl_top_in"),
        makeIcon("ico_top"),
      ]);
      const panelBottom = makePanel("pan_bottom", [
        makeLabel("lbl_bottom_in"),
        makeButton("btn_bottom", "Tap"),
      ]);
      const { map } = indicesFor([panelTop, panelBottom]);

      expectHigherThan(map, "pan_top", "pan_bottom");
      expectHigherThan(map, "lbl_top_in", "pan_bottom");
      expectHigherThan(map, "ico_top", "lbl_bottom_in");
      expectHigherThan(map, "ico_top", "btn_bottom");
      expectSubtreeBelow(map, "lbl_top_in", ["pan_bottom", "lbl_bottom_in", "btn_bottom"]);
    });
  });
});
