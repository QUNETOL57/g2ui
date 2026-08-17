import { describe, expect, it } from "vitest";

import {
  countPersistedProjects,
  isProjectLimitReached,
  MAX_PROJECTS_PER_USER,
} from "@shared/config/project-limits";
import type { ProjectCard } from "@pages/library/lib/library-helpers";

function makeCard(id: string): ProjectCard {
  return {
    id,
    name: "Untitled",
    width: 480,
    height: 320,
    template: "blank",
    createdAt: new Date(),
    updatedAt: new Date(),
    project: {
      id: "project_1",
      name: "Untitled",
      display: { width: 480, height: 320 },
      screens: [],
    },
  };
}

describe("project limits", () => {
  it("counts only persisted canvas ids", () => {
    const cards = [
      makeCard("22222222-2222-4222-8222-222222222222"),
      makeCard("local-draft"),
    ];
    expect(countPersistedProjects(cards)).toBe(1);
  });

  it("blocks creation when persisted count reaches the limit", () => {
    const cards = Array.from({ length: MAX_PROJECTS_PER_USER }, (_, index) =>
      makeCard(`11111111-1111-4111-8111-1111111111${String(index).padStart(2, "0")}`),
    );
    expect(isProjectLimitReached(cards, true)).toBe(true);
    expect(isProjectLimitReached(cards, false)).toBe(false);
  });
});
