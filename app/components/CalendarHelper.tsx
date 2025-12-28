"use client";

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { PlanEvent, Project } from '../lib/api';
import './calendar.css'; // Custom styles for FullCalendar

interface CalendarProps {
    events: PlanEvent[];
    projects: Project[];
    onDateClick: (date: Date) => void;
    onEventClick: (event: PlanEvent) => void;
}

export default function CalendarHelper({ events, projects, onDateClick, onEventClick }: CalendarProps) {

    // Transform API events to FullCalendar events
    const calendarEvents = events.map(e => {
        const project = projects.find(p => p.id === e.project_id);
        return {
            id: e.id.toString(),
            title: e.title,
            start: e.start_at,
            end: e.end_at, // FullCalendar end is exclusive, might need adjustment if using same-day logic
            backgroundColor: project?.color || '#3788d8',
            borderColor: project?.color || '#3788d8',
            allDay: e.is_all_day,
            extendedProps: { ...e }
        };
    });

    return (
        <div className="h-full w-full bg-white rounded-xl shadow-sm border p-4 flex flex-col min-h-0">
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                firstDay={1} // Monday start
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,dayGridWeek'
                }}
                events={calendarEvents}
                dateClick={(arg) => onDateClick(arg.date)}
                eventClick={(arg) => {
                    const originalEvent = events.find(e => e.id.toString() === arg.event.id);
                    if (originalEvent) onEventClick(originalEvent);
                }}
                height="100%"
                editable={false}
                selectable={true}
                dayMaxEvents={true}
            />
        </div>
    );
}
