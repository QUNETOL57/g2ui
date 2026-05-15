import type { UiProject, WidgetNode } from "..";
import { emptyProject } from "..";
import { helloSample } from "../samples/hello";

export type TemplateId = "hello" | "blank";

export interface ProjectTemplateArgs {
  id: string;
  name: string;
  width: number;
  height: number;
  template: TemplateId;
}

export function makeProjectFromTemplate(args: ProjectTemplateArgs): UiProject {
  const nextProject =
    args.template === "hello"
      ? helloSample()
      : emptyProject({
          id: args.id,
          name: args.name,
          width: args.width,
          height: args.height,
        });
  nextProject.id = args.id;
  nextProject.name = args.name;
  return args.template === "hello"
    ? resizeProject(nextProject, args.width, args.height)
    : nextProject;
}

export function resizeProject(project: UiProject, width: number, height: number): UiProject {
  const previousWidth = project.display.width || width;
  const previousHeight = project.display.height || height;
  const scaleX = width / previousWidth;
  const scaleY = height / previousHeight;
  project.display.width = width;
  project.display.height = height;

  for (const screen of project.screens) {
    screen.width = width;
    screen.height = height;
    scaleNodeFrames(screen, scaleX, scaleY);
  }

  return project;
}

function scaleNodeFrames(node: WidgetNode, scaleX: number, scaleY: number): void {
  if (node.frame) {
    node.frame = {
      x: Math.round(node.frame.x * scaleX),
      y: Math.round(node.frame.y * scaleY),
      width: Math.max(1, Math.round(node.frame.width * scaleX)),
      height: Math.max(1, Math.round(node.frame.height * scaleY)),
    };
  }
  for (const child of node.children ?? []) {
    scaleNodeFrames(child, scaleX, scaleY);
  }
}
