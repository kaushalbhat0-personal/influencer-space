import { CommandRegistry, CommandBus } from "./bus";
import {
  selectNodeCommand, deselectCommand, deleteNodeCommand, duplicateNodeCommand,
  moveNodeCommand, insertNodeCommand, changeDeviceCommand,
  zoomInCommand, zoomOutCommand, setZoomCommand,
  saveCommand, previewCommand, publishCommand,
  reorderNodeCommand, duplicateToCommand,
} from "./commands";

function createBuilderCommandBus(): CommandBus {
  const registry = new CommandRegistry();
  registry.register(selectNodeCommand);
  registry.register(deselectCommand);
  registry.register(deleteNodeCommand);
  registry.register(duplicateNodeCommand);
  registry.register(moveNodeCommand);
  registry.register(insertNodeCommand);
  registry.register(changeDeviceCommand);
  registry.register(zoomInCommand);
  registry.register(zoomOutCommand);
  registry.register(setZoomCommand);
  registry.register(saveCommand);
  registry.register(previewCommand);
  registry.register(publishCommand);
  registry.register(reorderNodeCommand);
  registry.register(duplicateToCommand);
  return new CommandBus(registry);
}

export const builderCommands = createBuilderCommandBus();
