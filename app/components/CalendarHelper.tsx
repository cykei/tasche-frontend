"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DatesSetArg, EventApi, EventContentArg } from "@fullcalendar/core";
import { Check } from "lucide-react";
import { PlanEvent, Todo } from "../lib/api";
import "./calendar.css";

type TodoSummaryData = {
    date: string;
    count: number;
};

export type CalendarItem = {
    id: string;
    title: string;
    start: string;
    end?: string;
    color: string;
    type: "project" | "todo" | "todo-summary";
    allDay?: boolean;
    data: PlanEvent | Todo | TodoSummaryData;
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
    const [currentView, setCurrentView] = useState("dayGridMonth");

    const displayItems = useMemo(() => {
        if (currentView !== "dayGridMonth") return items;
        const todoGroups = new Map<string, CalendarItem[]>();
        const others: CalendarItem[] = [];

        items.forEach(item => {
            if (item.type === "todo") {
                const todo = item.data as Todo;
                const key = todo.date;
                const list = todoGroups.get(key) ?? [];
                list.push(item);
                todoGroups.set(key, list);
            } else {
                others.push(item);
            }
        });

        const todoItems: CalendarItem[] = [];
        todoGroups.forEach((list, dateKey) => {
            list.sort((a, b) => a.start.localeCompare(b.start));
            const visible = list.slice(0, 2);
            todoItems.push(...visible);
            if (list.length > 2) {
                const base = visible[0] ?? list[0];
                const summary: CalendarItem = {
                    id: `todo-summary-${dateKey}`,
                    title: `+${list.length - 2}개`,
                    start: base.start,
                    end: base.end,
                    color: "#f97316",
                    type: "todo-summary",
                    allDay: true,
                    data: { date: dateKey, count: list.length - 2 },
                };
                todoItems.push(summary);
            }
        });

        return [...others, ...todoItems];
    }, [items, currentView]);

    const calendarEvents = displayItems.map((item) => {
        const isTodo = item.type === "todo";
        const isTodoSummary = item.type === "todo-summary";
        return ({
            id: item.id,
            title: item.title,
            start: item.start,
            end: item.end,
            backgroundColor: (isTodo || isTodoSummary) ? "transparent" : item.color,
            borderColor: (isTodo || isTodoSummary) ? "transparent" : item.color,
            textColor: (isTodo || isTodoSummary) ? "#f97316" : undefined,
            display: (isTodo || isTodoSummary) ? "block" : undefined,
            classNames: isTodo ? ["planner-todo-event"] : isTodoSummary ? ["planner-todo-summary-event"] : [],
            allDay: item.allDay ?? true,
            extendedProps: { calendarItem: item },
        });
    });

    const renderEventContent = useCallback((arg: EventContentArg) => {
        const calendarItem = arg.event.extendedProps.calendarItem as CalendarItem | undefined;
        if (!calendarItem || calendarItem.type === "project") {
            return (
                <div className="planner-project-event">
                    <span className="planner-project-title">{arg.event.title}</span>
                </div>
            );
        }
        if (calendarItem.type === "todo-summary") {
            const summary = calendarItem.data as TodoSummaryData;
            return <div className="planner-todo-summary">+{summary.count}개</div>;
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

    const handleDatesSet = useCallback((arg: DatesSetArg) => {
        setCurrentView(arg.view.type);
    }, []);

    const eventOrder = useCallback((a: EventApi, b: EventApi) => {
        const getRank = (event: EventApi) => {
            const calendarItem = event.extendedProps.calendarItem as CalendarItem | undefined;
            if (!calendarItem) return 0;
            if (calendarItem.type === "project") return 0;
            if (calendarItem.type === "todo") return 1;
            if (calendarItem.type === "todo-summary") return 2;
            return 0;
        };
        const diff = getRank(a) - getRank(b);
        if (diff !== 0) return diff;
        return a.title.localeCompare(b.title);
    }, []);

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
                eventOrder={eventOrder}
                expandRows
                height="auto"
                contentHeight="auto"
                handleWindowResize
                editable={false}
                selectable
                selectMirror
                dayMaxEvents={currentView === "dayGridMonth"}
                datesSet={handleDatesSet}
            />
        </div>
    );
}
