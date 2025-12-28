"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useCallback, useEffect, useRef } from "react";
import type { EventContentArg } from "@fullcalendar/core";
import { Check } from "lucide-react";
import { PlanEvent, Todo } from "../lib/api";
import "./calendar.css";

export type CalendarItem = {
    id: string;
    title: string;
    start: string;
    end?: string;
    color: string;
    type: "project" | "todo";
    allDay?: boolean;
    data: PlanEvent | Todo;
};

interface CalendarProps {
    items: CalendarItem[];
    focusDate?: string | null;
    onDateClick?: (date: Date) => void;
    onRangeSelect?: (start: Date, end: Date) => void;
    onEventClick?: (item: CalendarItem) => void;
}

export default function CalendarHelper({ items, focusDate, onDateClick, onRangeSelect, onEventClick }: CalendarProps) {
    const calendarRef = useRef<FullCalendar | null>(null);
    const calendarEvents = items.map((item) => {
        const isTodo = item.type === "todo";
        return ({
            id: item.id,
            title: item.title,
            start: item.start,
            end: item.end,
            backgroundColor: isTodo ? "transparent" : item.color,
            borderColor: isTodo ? "transparent" : item.color,
            textColor: isTodo ? "#f97316" : undefined,
            display: isTodo ? "block" : undefined,
            classNames: isTodo ? ["planner-todo-event"] : [],
            allDay: item.allDay ?? true,
            extendedProps: { calendarItem: item },
        });
    });

    const renderEventContent = useCallback((arg: EventContentArg) => {
        const calendarItem = arg.event.extendedProps.calendarItem as CalendarItem | undefined;
        if (!calendarItem) {
            return (
                <div className="planner-project-event">
                    <span className="planner-project-title">{arg.event.title}</span>
                </div>
            );
        }
        if (calendarItem.type === "project") {
            return (
                <div className="planner-project-event">
                    <span className="planner-project-title">{arg.event.title}</span>
                </div>
            );
        }
        const todo = calendarItem.data as Todo;
        return (
            <div className="planner-todo-chip">
                <span className={`planner-todo-checkbox ${todo.is_done ? "checked" : ""}`}>
                    <Check size={12} />
                </span>
                <span className="planner-todo-title">{todo.title}</span>
            </div>
        );
    }, []);

    useEffect(() => {
        if (focusDate && calendarRef.current) {
            calendarRef.current.getApi().gotoDate(focusDate);
        }
    }, [focusDate]);

    return (
        <div className="calendar-shell">
            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                firstDay={1}
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,dayGridWeek",
                }}
                events={calendarEvents}
                dateClick={(arg) => onDateClick?.(arg.date)}
                select={(arg) => onRangeSelect?.(arg.start, arg.end)}
                eventClick={(arg) => {
                    const calendarItem = arg.event.extendedProps.calendarItem as CalendarItem | undefined;
                    if (calendarItem) onEventClick?.(calendarItem);
                }}
                eventContent={renderEventContent}
                expandRows
                height="auto"
                contentHeight="auto"
                handleWindowResize
                editable={false}
                selectable
                selectMirror
                dayMaxEvents
            />
        </div>
    );
}
