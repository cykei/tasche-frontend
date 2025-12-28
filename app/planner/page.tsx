"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { Plus, X } from "lucide-react";
import { api, PlanEvent, Project, Todo } from "../lib/api";
import CalendarHelper, { CalendarItem } from "../components/CalendarHelper";

const FILTERS = [
    { key: "all", label: "전체 보기" },
    { key: "projects", label: "프로젝트" },
    { key: "todos", label: "오늘 할 일" },
] as const;

const COLOR_PRESETS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#F439A0', '#A142F4', '#24C1E0'];

const todayString = () => format(new Date(), "yyyy-MM-dd");

export default function PlannerPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [events, setEvents] = useState<PlanEvent[]>([]);
    const [todos, setTodos] = useState<Todo[]>([]);

    const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
    const [showProjectForm, setShowProjectForm] = useState(false);

    const [projectName, setProjectName] = useState("");
    const [projectNote, setProjectNote] = useState("");
    const [projectColor, setProjectColor] = useState(COLOR_PRESETS[0]);
    const [projectStart, setProjectStart] = useState(todayString());
    const [projectEnd, setProjectEnd] = useState(todayString());

    const fetchProjects = useCallback(async () => {
        try {
            const data = await api.projects.list();
            setProjects(data);
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchEvents = useCallback(async () => {
        try {
            const data = await api.events.list();
            setEvents(data);
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchTodos = useCallback(async () => {
        try {
            const data = await api.todos.list();
            setTodos(data);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            await Promise.all([fetchProjects(), fetchEvents(), fetchTodos()]);
        };
        void load();
    }, [fetchProjects, fetchEvents, fetchTodos]);

    const resetProjectForm = () => {
        setProjectName("");
        setProjectNote("");
        setProjectColor(COLOR_PRESETS[0]);
        const today = todayString();
        setProjectStart(today);
        setProjectEnd(today);
    };

    const handleRangeSelect = (start: Date, end: Date) => {
        const startStr = format(start, "yyyy-MM-dd");
        const inclusiveEnd = addDays(end, -1);
        const safeEnd = inclusiveEnd < start ? start : inclusiveEnd;
        const endStr = format(safeEnd, "yyyy-MM-dd");
        setProjectStart(startStr);
        setProjectEnd(endStr);
        setShowProjectForm(true);
    };

    const handleManualStartChange = (value: string) => {
        setProjectStart(value);
        if (value > projectEnd) setProjectEnd(value);
    };

    const handleManualEndChange = (value: string) => {
        if (value < projectStart) {
            setProjectEnd(projectStart);
            return;
        }
        setProjectEnd(value);
    };

    const handleSaveProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectName.trim()) return;
        try {
            const project = await api.projects.create({
                name: projectName.trim(),
                color: projectColor,
                description: projectNote,
            });
            setProjects(prev => [...prev, project]);

            await api.events.create({
                project_id: project.id,
                title: projectName.trim(),
                start_at: new Date(projectStart).toISOString(),
                end_at: addDays(new Date(projectEnd), 1).toISOString(),
                is_all_day: true,
                note: projectNote,
            });
            await fetchEvents();
            setShowProjectForm(false);
            resetProjectForm();
        } catch (error) {
            console.error(error);
        }
    };

    const calendarItems: CalendarItem[] = useMemo(() => {
        const projectColors = new Map(projects.map(project => [project.id, project.color]));
        const projectEntries: CalendarItem[] = events.map(event => ({
            id: `event-${event.id}`,
            title: event.title,
            start: event.start_at,
            end: event.end_at,
            color: projectColors.get(event.project_id) || "#2563eb",
            type: "project",
            allDay: event.is_all_day,
            data: event,
        }));

        const todoEntries: CalendarItem[] = todos.map(todo => {
            const startDate = new Date(todo.date);
            return {
                id: `todo-${todo.id}`,
                title: `할 일 · ${todo.title}`,
                start: startDate.toISOString(),
                end: addDays(startDate, 1).toISOString(),
                color: "#f97316",
                type: "todo",
                allDay: true,
                data: todo,
            };
        });

        if (activeFilter === "projects") return projectEntries;
        if (activeFilter === "todos") return todoEntries;
        return [...projectEntries, ...todoEntries];
    }, [events, todos, projects, activeFilter]);

    const handleCalendarEventClick = async (item: CalendarItem) => {
        if (item.type === "project") {
            const event = item.data as PlanEvent;
            if (confirm(`Delete "${event.title}" from the calendar?`)) {
                await api.events.delete(event.id);
                await fetchEvents();
            }
        } else {
            alert("오늘 할 일은 Daily 페이지에서 관리해주세요.");
        }
    };

    return (
        <div className="planner-page">
            <div className="planner-main">
                <div className={`planner-calendar-area ${showProjectForm ? "panel-open" : ""}`}>
                    <div className="planner-calendar-header">
                        <div>
                            <h1>월간 캘린더</h1>
                            <p>프로젝트 일정과 오늘의 할 일을 한 화면에서 확인하세요.</p>
                        </div>
                        <div className="planner-filter-group">
                            {FILTERS.map(filter => (
                                <button
                                    key={filter.key}
                                    className={`planner-filter ${activeFilter === filter.key ? "active" : ""}`}
                                    onClick={() => setActiveFilter(filter.key)}
                                    type="button"
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="planner-calendar">
                        <CalendarHelper
                            items={calendarItems}
                            onRangeSelect={handleRangeSelect}
                            onEventClick={handleCalendarEventClick}
                        />
                    </div>

                    <div className="planner-footer">
                        <button
                            className="planner-add-button"
                            type="button"
                            onClick={() => {
                                resetProjectForm();
                                setShowProjectForm(true);
                            }}
                        >
                            <Plus size={18} />
                            프로젝트 추가
                        </button>
                    </div>
                </div>

                {showProjectForm && (
                    <aside className="planner-form-panel">
                        <div className="planner-form-head">
                            <div>
                                <h3>새 프로젝트</h3>
                                <p>달력에 표시할 프로젝트 기간을 지정하세요.</p>
                            </div>
                            <button className="planner-close" onClick={() => setShowProjectForm(false)} type="button" aria-label="닫기">
                                <X size={16} />
                            </button>
                        </div>

                        <form className="planner-form" onSubmit={handleSaveProject}>
                            <label className="planner-field">
                                <span>프로젝트 이름</span>
                                <input
                                    className="input"
                                    placeholder="예: 신규 캠페인 준비"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                />
                            </label>

                            <div className="planner-field dual">
                                <label>
                                    <span>시작일</span>
                                    <input
                                        type="date"
                                        className="input"
                                        value={projectStart}
                                        onChange={(e) => handleManualStartChange(e.target.value)}
                                    />
                                </label>
                                <label>
                                    <span>종료일</span>
                                    <input
                                        type="date"
                                        className="input"
                                        value={projectEnd}
                                        onChange={(e) => handleManualEndChange(e.target.value)}
                                    />
                                </label>
                            </div>

                            <label className="planner-field">
                                <span>메모</span>
                                <textarea
                                    className="planner-textarea"
                                    rows={3}
                                    placeholder="세부 설명을 입력하세요."
                                    value={projectNote}
                                    onChange={(e) => setProjectNote(e.target.value)}
                                />
                            </label>

                            <div className="planner-field">
                                <span>색상</span>
                                <div className="planner-color-options">
                                    {COLOR_PRESETS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setProjectColor(color)}
                                            className={`color-swatch ${projectColor === color ? "selected" : ""}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        className="color-picker-input"
                                        value={projectColor}
                                        onChange={(e) => setProjectColor(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="planner-form-actions">
                                <button type="button" className="ghost-pill" onClick={() => setShowProjectForm(false)}>
                                    취소
                                </button>
                                <button type="submit" className="btn" disabled={!projectName.trim()}>
                                    프로젝트 저장
                                </button>
                            </div>
                        </form>
                    </aside>
                )}
            </div>
        </div>
    );
}
