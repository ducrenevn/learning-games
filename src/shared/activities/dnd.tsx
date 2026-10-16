import type { ReactNode } from 'react';
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, pointerWithin, rectIntersection, useSensor, useSensors,
  type CollisionDetection, type DragCancelEvent, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';

/**
 * Drag-and-drop is an enhancement over a complete non-drag path (select-and-place, or the up/down buttons), so only
 * pointer sensors are used: a mouse drags after 6 px of movement (a plain click stays a click), a finger after a
 * 200 ms press — a quick swipe scrolls the page or the card bank as usual. No keyboard sensor, no dnd-kit
 * `attributes`: the keyboard and screen-reader path is the existing buttons, and no English dnd-kit instructions leak in.
 */
export function useDragSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );
}
const silent = {
  onDragStart: () => undefined, onDragOver: () => undefined, onDragEnd: () => undefined, onDragCancel: () => undefined,
};
/** The pointer is the truth while dragging: prefer the container under it, fall back to overlap. */
const collision: CollisionDetection = args => {
  const within = pointerWithin(args);
  return within.length ? within : rectIntersection(args);
};

interface DragAreaProps {
  onStart?: (event: DragStartEvent) => void;
  onEnd: (event: DragEndEvent) => void;
  onCancel?: (event: DragCancelEvent) => void;
  /** What follows the pointer. Rendered in a portal, so scroll containers cannot clip it. */
  overlay: ReactNode;
  children: ReactNode;
}
export function DragArea({ onStart, onEnd, onCancel, overlay, children }: DragAreaProps) {
  const sensors = useDragSensors();
  return <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={onCancel}
    accessibility={{ announcements: silent, screenReaderInstructions: { draggable: '' } }}>
    {children}
    <DragOverlay dropAnimation={null}>{overlay}</DragOverlay>
  </DndContext>;
}
