/**
 * EditableCalendarGrid — drag-and-drop variant of CalendarGrid for schedule editing.
 *
 * Architecture
 * ────────────
 * • The parent (ScheduleEditPage) owns DndContext and DragOverlay.
 * • This component renders:
 *     – DroppableCell  for every day × slot cell (useDroppable)
 *     – DraggableCard  for every visible activity (useDraggable)
 * • Draggable ID = schedRecId (the ScheduledActivity _id).
 * • Droppable ID = "drop-{dayIdx}-{slotIdx}".
 */

import { useDraggable, useDroppable } from '@dnd-kit/core';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useState } from 'react';
import { toTitleLabel } from '../../utils/text';
import type {
  InstitutionCourse,
  InstitutionGroup,
  InstitutionUser,
  InstitutionRoom,
} from '../../api/institutions';
import type { ScheduledEntry } from './CalendarGrid';
import { DAY_H, DAY_LABEL_W, HDR_H, SLOT_W, getDayName, getActivityTypeColor } from './CalendarGrid';

// ─── Droppable cell ────────────────────────────────────────────────────────

function DroppableCell({
  id,
  left,
  width,
  height,
  isOver,
}: {
  id: string;
  left: number;
  width: number;
  height: number;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id });
  const theme = useTheme();
  return (
    <Box
      ref={setNodeRef}
      sx={{
        position: 'absolute',
        left,
        top: 0,
        width,
        height,
        bgcolor: isOver ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
        transition: 'background-color 100ms',
      }}
    />
  );
}

// ─── Draggable activity card ────────────────────────────────────────────────

type CardState = 'normal' | 'pending' | 'conflict';

interface DraggableCardProps {
  entry: ScheduledEntry;
  lane: number;
  laneCount: number;
  slotIdx: number;
  cardState: CardState;
  courseName: string;
  groupName: string;
  profName: string | null;
  roomName: string;
  rooms: InstitutionRoom[];
  onRoomChange: (recordId: string, newRoomId: string) => void;
  isDragActive: boolean; // true while ANY card is being dragged (disable room click)
}

function DraggableCard({
  entry,
  lane,
  laneCount,
  slotIdx,
  cardState,
  courseName,
  groupName,
  profName,
  roomName,
  rooms,
  onRoomChange,
  isDragActive,
}: DraggableCardProps) {
  const theme = useTheme();
  const typeColor = getActivityTypeColor(entry.activityType);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: entry.schedRecId,
  });

  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);

  const laneH = DAY_H / laneCount;
  const top = lane * laneH + 1;
  const height = laneH - 2;
  const width = entry.durationSlots * SLOT_W - 4;
  const left = slotIdx * SLOT_W + 2;

  const borderColor =
    cardState === 'conflict'
      ? theme.palette.error.main
      : cardState === 'pending'
      ? theme.palette.warning.main
      : typeColor;

  const bgColor =
    cardState === 'conflict'
      ? alpha(theme.palette.error.main, 0.15)
      : cardState === 'pending'
      ? alpha(theme.palette.warning.main, 0.15)
      : alpha(typeColor, 0.1);

  const borderStyle = cardState === 'pending' ? 'dashed' : 'solid';

  return (
    <>
      <Box
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        sx={{
          position: 'absolute',
          top,
          height,
          left,
          width,
          borderRadius: 1.5,
          bgcolor: bgColor,
          borderLeft: `3px ${borderStyle}`,
          borderLeftColor: borderColor,
          outline: cardState !== 'normal' ? `1px ${borderStyle} ${alpha(borderColor, 0.4)}` : 'none',
          p: '3px 6px',
          cursor: isDragging ? 'grabbing' : 'grab',
          overflow: 'hidden',
          opacity: isDragging ? 0.35 : 1,
          zIndex: isDragging ? 0 : 1,
          userSelect: 'none',
          '&:hover': { bgcolor: alpha(borderColor, 0.2) },
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, display: 'block', lineHeight: 1.25, fontSize: '0.68rem', mb: 0.25 }}
        >
          {courseName}
        </Typography>
        {height > 30 && (
          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.60rem', color: 'text.secondary', lineHeight: 1.3 }}>
            {toTitleLabel(entry.activityType)}
          </Typography>
        )}
        {height > 44 && (
          <>
            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.60rem', color: 'text.secondary', lineHeight: 1.3 }}>
              {groupName}
            </Typography>
            {profName && (
              <Typography variant="caption" sx={{ display: 'block', fontSize: '0.60rem', color: 'text.secondary', lineHeight: 1.3 }}>
                {profName}
              </Typography>
            )}
            {/* Room — clickable to change */}
            <Box
              component="span"
              onClick={(e) => {
                if (isDragActive) return;
                e.stopPropagation();
                setPopoverAnchor(e.currentTarget as HTMLElement);
              }}
              sx={{
                display: 'block',
                fontSize: '0.58rem',
                color: cardState === 'normal' ? 'primary.main' : borderColor,
                lineHeight: 1.3,
                cursor: 'pointer',
                textDecoration: 'underline dotted',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                '&:hover': { opacity: 0.8 },
              }}
            >
              {roomName}
            </Box>
          </>
        )}
      </Box>

      {/* Room picker popover */}
      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor}
        onClose={() => setPopoverAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { borderRadius: 2, p: 1.5, minWidth: 240 } } }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 1, color: 'text.secondary' }}>
          Change room
        </Typography>
        <Autocomplete
          size="small"
          options={rooms}
          getOptionLabel={(r) => r.name}
          value={rooms.find((r) => String(r.id ?? r._id ?? '') === entry.roomId) ?? null}
          onChange={(_, newRoom) => {
            if (newRoom) {
              onRoomChange(entry.schedRecId, String(newRoom.id ?? newRoom._id ?? ''));
              setPopoverAnchor(null);
            }
          }}
          renderInput={(params) => <TextField {...params} label="Room" autoFocus />}
          sx={{ width: 220 }}
        />
      </Popover>
    </>
  );
}

// ─── Lane assignment (same as CalendarGrid) ────────────────────────────────

interface LanedEntry {
  entry: ScheduledEntry;
  lane: number;
  laneCount: number;
}

function assignLanes(dayEntries: ScheduledEntry[], timeslotsPerDay: number): LanedEntry[] {
  if (dayEntries.length === 0) return [];
  const items = dayEntries
    .map((e) => ({
      entry: e,
      start: e.startTimeslot % timeslotsPerDay,
      end: (e.startTimeslot % timeslotsPerDay) + e.durationSlots - 1,
    }))
    .sort((a, b) => (a.start !== b.start ? a.start - b.start : b.end - a.end));

  const result: LanedEntry[][] = [];
  let i = 0;
  while (i < items.length) {
    let sweepEnd = items[i].end;
    let j = i;
    while (j < items.length && items[j].start <= sweepEnd) {
      sweepEnd = Math.max(sweepEnd, items[j].end);
      j++;
    }
    const group = items.slice(i, j);
    const laneEnd: number[] = [];
    const groupLanes: number[] = [];
    for (const item of group) {
      let lane = laneEnd.findIndex((end) => end <= item.start);
      if (lane === -1) { lane = laneEnd.length; laneEnd.push(0); }
      laneEnd[lane] = item.end + 1;
      groupLanes.push(lane);
    }
    const laneCount = laneEnd.length;
    const laned: LanedEntry[] = group.map((item, k) => ({
      entry: item.entry,
      lane: groupLanes[k],
      laneCount,
    }));
    result.push(laned);
    i = j;
  }
  return result.flat();
}

// ─── Props ─────────────────────────────────────────────────────────────────

export interface EditableCalendarGridProps {
  entries: ScheduledEntry[];
  days: number;
  timeslotsPerDay: number;
  selectedWeek: number;
  coursesById: Map<string, InstitutionCourse>;
  groupsById: Map<string, InstitutionGroup>;
  usersById: Map<string, InstitutionUser>;
  roomsById: Map<string, InstitutionRoom>;
  rooms: InstitutionRoom[];
  pendingRecordIds: Set<string>;
  conflictingRecordIds: Set<string>;
  activeDropId: string | null; // id of the cell being hovered during drag
  onRoomChange: (recordId: string, newRoomId: string) => void;
  isDragActive: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function EditableCalendarGrid({
  entries,
  days,
  timeslotsPerDay,
  selectedWeek,
  coursesById,
  groupsById,
  usersById,
  roomsById,
  rooms,
  pendingRecordIds,
  conflictingRecordIds,
  activeDropId,
  onRoomChange,
  isDragActive,
}: EditableCalendarGridProps) {
  const theme = useTheme();

  const activeEntries = entries.filter((e) => e.activeWeeks.includes(selectedWeek));

  return (
    <Box sx={{ overflowX: 'auto', width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: DAY_LABEL_W + timeslotsPerDay * SLOT_W,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ width: DAY_LABEL_W, flexShrink: 0, height: HDR_H, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRight: '1px solid', borderColor: 'divider' }} />
          {Array.from({ length: timeslotsPerDay }, (_, i) => (
            <Box
              key={i}
              sx={{
                width: SLOT_W, flexShrink: 0, height: HDR_H,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                borderRight: i < timeslotsPerDay - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.70rem' }}>
                {i + 1}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Day rows */}
        {Array.from({ length: days }, (_, dayIdx) => {
          const dayEntries = activeEntries.filter(
            (e) => Math.floor(e.startTimeslot / timeslotsPerDay) === dayIdx,
          );
          const laned = assignLanes(dayEntries, timeslotsPerDay);

          return (
            <Box
              key={dayIdx}
              sx={{
                display: 'flex', flexShrink: 0,
                borderBottom: dayIdx < days - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              {/* Day label */}
              <Box
                sx={{
                  width: DAY_LABEL_W, flexShrink: 0, height: DAY_H,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                  borderRight: '1px solid', borderColor: 'divider',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                  {getDayName(dayIdx)}
                </Typography>
              </Box>

              {/* Slot cells + cards */}
              <Box sx={{ position: 'relative', width: timeslotsPerDay * SLOT_W, height: DAY_H, flexShrink: 0 }}>
                {/* Droppable cells (one per slot) */}
                {Array.from({ length: timeslotsPerDay }, (_, slotIdx) => {
                  const dropId = `drop-${dayIdx}-${slotIdx}`;
                  return (
                    <DroppableCell
                      key={dropId}
                      id={dropId}
                      left={slotIdx * SLOT_W}
                      width={SLOT_W}
                      height={DAY_H}
                      isOver={activeDropId === dropId}
                    />
                  );
                })}

                {/* Slot dividers */}
                {Array.from({ length: timeslotsPerDay }, (_, i) => (
                  <Box
                    key={i}
                    sx={{
                      position: 'absolute',
                      left: i * SLOT_W, top: 0, width: SLOT_W, height: DAY_H,
                      borderRight: i < timeslotsPerDay - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      pointerEvents: 'none',
                    }}
                  />
                ))}

                {/* Activity cards */}
                {laned.map(({ entry: e, lane, laneCount }) => {
                  const slotIdx = e.startTimeslot % timeslotsPerDay;
                  const courseName = coursesById.get(e.courseId)?.name ?? '—';
                  const groupName = groupsById.get(e.groupId)?.name ?? '—';
                  const profName = e.professorId
                    ? (usersById.get(e.professorId)?.name ?? usersById.get(e.professorId)?.email ?? '—')
                    : null;
                  const roomName = roomsById.get(e.roomId)?.name ?? '—';
                  const cardState: CardState = conflictingRecordIds.has(e.schedRecId)
                    ? 'conflict'
                    : pendingRecordIds.has(e.schedRecId)
                    ? 'pending'
                    : 'normal';

                  return (
                    <DraggableCard
                      key={e.schedRecId}
                      entry={e}
                      lane={lane}
                      laneCount={laneCount}
                      slotIdx={slotIdx}
                      cardState={cardState}
                      courseName={courseName}
                      groupName={groupName}
                      profName={profName}
                      roomName={roomName}
                      rooms={rooms}
                      onRoomChange={onRoomChange}
                      isDragActive={isDragActive}
                    />
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
