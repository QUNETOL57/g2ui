import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CustomSelect } from "@shared/ui/CustomSelect";

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Bravo" },
  { value: "c", label: "Charlie" },
];

describe("CustomSelect", () => {
  it("renders the selected option label and aria attributes", () => {
    render(<CustomSelect value="b" options={OPTIONS} onChange={() => undefined} ariaLabel="pick" />);
    const trigger = screen.getByRole("button", { name: "pick" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveTextContent("Bravo");
  });

  it("opens the listbox on click and shows options", async () => {
    render(<CustomSelect value="a" options={OPTIONS} onChange={() => undefined} ariaLabel="pick" />);
    await userEvent.click(screen.getByRole("button", { name: "pick" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.textContent)).toEqual(
      expect.arrayContaining(["Alpha", "Bravo", "Charlie"].map((label) => expect.stringContaining(label))),
    );
  });

  it("emits onChange and closes when an option is picked", async () => {
    const onChange = vi.fn();
    render(<CustomSelect value="a" options={OPTIONS} onChange={onChange} ariaLabel="pick" />);
    await userEvent.click(screen.getByRole("button", { name: "pick" }));
    await userEvent.click(screen.getByRole("option", { name: /Charlie/ }));
    expect(onChange).toHaveBeenCalledWith("c");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("marks the currently selected option with aria-selected=true", async () => {
    render(<CustomSelect value="b" options={OPTIONS} onChange={() => undefined} ariaLabel="pick" />);
    await userEvent.click(screen.getByRole("button", { name: "pick" }));
    const selected = screen.getByRole("option", { selected: true });
    expect(selected).toHaveTextContent("Bravo");
  });

  it("closes when Escape is pressed", async () => {
    render(<CustomSelect value="a" options={OPTIONS} onChange={() => undefined} ariaLabel="pick" />);
    const trigger = screen.getByRole("button", { name: "pick" });
    await userEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes when clicking outside", async () => {
    render(
      <div>
        <CustomSelect value="a" options={OPTIONS} onChange={() => undefined} ariaLabel="pick" />
        <div data-testid="outside">outside</div>
      </div>,
    );
    await userEvent.click(screen.getByRole("button", { name: "pick" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByTestId("outside") });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("renders color swatches when option.color is set", async () => {
    const options = [
      { value: "r", label: "Red", color: "#FF0000" },
      { value: "g", label: "Green", color: "#00FF00" },
    ];
    render(<CustomSelect value="r" options={options} onChange={() => undefined} ariaLabel="color" />);
    await userEvent.click(screen.getByRole("button", { name: "color" }));
    const trigger = screen.getByRole("button", { name: "color" });
    expect(trigger.querySelector('[aria-hidden="true"][style*="background-color"]')).toBeTruthy();
  });

  it("falls back to the first option when value is unknown", () => {
    render(<CustomSelect value="zzz" options={OPTIONS} onChange={() => undefined} ariaLabel="pick" />);
    expect(screen.getByRole("button", { name: "pick" })).toHaveTextContent("Alpha");
  });
});
