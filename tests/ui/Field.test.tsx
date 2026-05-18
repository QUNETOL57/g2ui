import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Field } from "@shared/ui/Field";

describe("Field", () => {
  it("renders label and children", () => {
    render(
      <Field label="Name">
        <input aria-label="name input" />
      </Field>,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("name input")).toBeInTheDocument();
  });

  it("renders error when provided", () => {
    render(
      <Field label="Email" error="invalid">
        <input />
      </Field>,
    );
    expect(screen.getByText("invalid")).toBeInTheDocument();
  });

  it("renders hint only when there is no error", () => {
    const { rerender } = render(
      <Field label="x" hint="tip">
        <input />
      </Field>,
    );
    expect(screen.getByText("tip")).toBeInTheDocument();

    rerender(
      <Field label="x" hint="tip" error="bad">
        <input />
      </Field>,
    );
    expect(screen.queryByText("tip")).not.toBeInTheDocument();
    expect(screen.getByText("bad")).toBeInTheDocument();
  });

  it("works without a label", () => {
    render(
      <Field>
        <input aria-label="bare" />
      </Field>,
    );
    expect(screen.getByLabelText("bare")).toBeInTheDocument();
  });
});
