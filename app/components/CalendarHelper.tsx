"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useRef } from "react";
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
    const calendarEvents = items.map((item) => ({
        id: item.id,
        title: item.title,
        start: item.start,
        end: item.end,
        backgroundColor: item.color,
        borderColor: item.color,
        allDay: item.allDay ?? true,
        extendedProps: { calendarItem: item },
    }));

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
