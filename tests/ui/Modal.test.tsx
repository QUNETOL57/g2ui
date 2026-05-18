import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "@shared/ui/Modal";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal open={false}>
        <div>hidden</div>
      </Modal>,
    );
    expect(screen.queryByText("hidden")).not.toBeInTheDocument();
  });

  it("renders children when open", () => {
    render(
      <Modal open>
        <div>visible</div>
      </Modal>,
    );
    expect(screen.getByText("visible")).toBeInTheDocument();
  });

  it("calls onClose on Escape by default", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <div>content</div>
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose on Escape when closeOnEscape=false", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} closeOnEscape={false}>
        <div>content</div>
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when clicking the backdrop", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <button type="button">inside</button>
      </Modal>,
    );
    const backdrop = screen.getByText("inside").parentElement!.parentElement!;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not close when clicking inside the dialog", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <button type="button">inside</button>
      </Modal>,
    );
    await userEvent.click(screen.getByText("inside"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close on backdrop click when closeOnBackdrop=false", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} closeOnBackdrop={false}>
        <button type="button">inside</button>
      </Modal>,
    );
    const backdrop = screen.getByText("inside").parentElement!.parentElement!;
    await userEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("supports size variant via className", () => {
    const { rerender } = render(
      <Modal open>
        <div>x</div>
      </Modal>,
    );
    const sm = screen.getByText("x").parentElement!;
    expect(sm.className).toMatch(/sizeMd/);
    rerender(
      <Modal open size="sm">
        <div>y</div>
      </Modal>,
    );
    expect(screen.getByText("y").parentElement!.className).toMatch(/sizeSm/);
  });
});
