"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { Plus, Trash2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { api, PlanEvent, Project, Todo } from "../lib/api";
import CalendarHelper, { CalendarItem } from "../components/CalendarHelper";
import Modal from "../components/Modal";

const FILTERS = [
    { key: "all", label: "전체 보기" },
    { key: "projects", label: "프로젝트" },
    { key: "todos", label: "오늘 할 일" },
] as const;

const COLOR_PRESETS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#F439A0', '#A142F4', '#24C1E0', '#0EA5E9'];

type TodoFormState = {
    title: string;
    content: string;
    date: string;
    is_done: boolean;
};

const todayString = () => format(new Date(), "yyyy-MM-dd");
const toNaiveDateTime = (value: Date) => format(value, "yyyy-MM-dd'T'HH:mm:ss");

function PlannerContent() {
    const searchParams = useSearchParams();
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
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<PlanEvent | null>(null);
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
    const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
    const [todoForm, setTodoForm] = useState<TodoFormState>({
        title: "",
        content: "",
        date: todayString(),
        is_done: false,
    });

    const selectedProjectId = useMemo(() => {
        const param = searchParams.get("project");
        if (!param) return null;
        const parsed = Number(param);
        return Number.isNaN(parsed) ? null : parsed;
    }, [searchParams]);

    const selectedProject = projects.find((project) => project.id === selectedProjectId);
    const focusDate = useMemo(() => {
        if (!selectedProjectId) return null;
        const matchingEvent = events
            .filter((event) => event.project_id === selectedProjectId)
            .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0];
        return matchingEvent ? matchingEvent.start_at : null;
    }, [events, selectedProjectId]);

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
                start_at: toNaiveDateTime(new Date(`${projectStart}T00:00:00`)),
                end_at: toNaiveDateTime(addDays(new Date(`${projectEnd}T00:00:00`), 1)),
                is_all_day: true,
                note: projectNote,
            });
            await fetchEvents();
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("projects:refresh"));
            }
            setShowProjectForm(false);
            resetProjectForm();
        } catch (error) {
            console.error(error);
        }
    };

    const updateTodoForm = <K extends keyof TodoFormState>(key: K, value: TodoFormState[K]) => {
        setTodoForm(prev => ({ ...prev, [key]: value }));
    };

    const openTodoModal = (todo: Todo) => {
        setEditingTodo(todo);
        setTodoForm({
            title: todo.title,
            content: todo.content ?? "",
            date: todo.date,
            is_done: todo.is_done,
        });
        setIsTodoModalOpen(true);
    };

    const closeTodoModal = () => {
        setIsTodoModalOpen(false);
        setEditingTodo(null);
    };

    const handleTodoSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingTodo || !todoForm.title.trim()) return;
        try {
            const updated = await api.todos.update(editingTodo.id, {
                title: todoForm.title.trim(),
                content: todoForm.content,
                date: todoForm.date,
                is_done: todoForm.is_done,
            });
            setTodos(prev => prev.map(todo => (todo.id === updated.id ? updated : todo)));
            setIsTodoModalOpen(false);
            setEditingTodo(null);
        } catch (error) {
            console.error(error);
        }
    };

    const calendarItems: CalendarItem[] = useMemo(() => {
        const projectColors = new Map(projects.map(project => [project.id, project.color]));
        const scopedEvents = selectedProjectId ? events.filter(event => event.project_id === selectedProjectId) : events;
        const projectEntries: CalendarItem[] = scopedEvents.map(event => ({
            id: `event-${event.id}`,
            title: event.title,
            start: event.start_at,
            end: event.end_at,
            color: projectColors.get(event.project_id) || "#2563eb",
            type: "project",
            allDay: event.is_all_day,
            data: event,
        }));

        const includeTodos = !selectedProjectId && activeFilter !== "projects";
        const todoEntries: CalendarItem[] = includeTodos ? todos.map(todo => {
            const startDate = new Date(todo.date);
            return {
                id: `todo-${todo.id}`,
                title: todo.title,
                start: startDate.toISOString(),
                end: addDays(startDate, 1).toISOString(),
                color: "#f97316",
                type: "todo",
                allDay: true,
                data: todo,
            };
        }) : [];

        if (activeFilter === "projects" || selectedProjectId) return projectEntries;
        if (activeFilter === "todos") return todoEntries;
        return [...projectEntries, ...todoEntries];
    }, [events, todos, projects, activeFilter, selectedProjectId]);

    const handleCalendarEventClick = (item: CalendarItem) => {
        if (item.type === "project") {
            const event = item.data as PlanEvent;
            setDeleteTarget(event);
            setIsDeleteModalOpen(true);
        } else if (item.type === "todo") {
            const todo = item.data as Todo;
            openTodoModal(todo);
        } else {
            // summary events are informational only
        }
    };

    const handleDeleteProject = async () => {
        if (!deleteTarget) return;
        try {
            await Promise.all([
                api.events.delete(deleteTarget.id),
                api.projects.delete(deleteTarget.project_id),
            ]);
            await fetchEvents();
            await fetchProjects();
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("projects:refresh"));
            }
        } catch (error) {
            console.error(error);
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
                            {selectedProject && (
                                <span className="planner-selected-project">
                                    {selectedProject.name} 프로젝트 보기
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="planner-calendar">
                        <CalendarHelper
                            items={calendarItems}
                            focusDate={focusDate}
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
                {isDeleteModalOpen && (
                    <div className="planner-delete-overlay">
                        <div className="planner-delete-card">
                            <h4>프로젝트 삭제</h4>
                            <p className="text-sm text-gray-600">
                                해당 프로젝트를 삭제하면 연결된 모든 일정도 함께 제거됩니다. 계속하시겠습니까?
                            </p>
                            {deleteTarget && (
                                <div className="planner-delete-preview">
                                    <div className="planner-delete-icon">
                                        <Trash2 size={18} />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{deleteTarget.title}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    className="ghost-pill"
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setDeleteTarget(null);
                                    }}
                                >
                                    취소
                                </button>
                                <button type="button" className="btn bg-red-500 hover:bg-red-600" onClick={handleDeleteProject}>
                                    삭제
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {editingTodo && (
                    <Modal
                        isOpen={isTodoModalOpen}
                        onClose={closeTodoModal}
                        title="할 일 수정"
                    >
                        <form className="planner-form" onSubmit={handleTodoSave}>
                            <label className="planner-field">
                                <span>제목</span>
                                <input
                                    className="input"
                                    value={todoForm.title}
                                    onChange={(e) => updateTodoForm("title", e.target.value)}
                                    placeholder="할 일 제목"
                                />
                            </label>
                            <label className="planner-field">
                                <span>설명</span>
                                <textarea
                                    className="planner-textarea"
                                    rows={3}
                                    value={todoForm.content}
                                    onChange={(e) => updateTodoForm("content", e.target.value)}
                                    placeholder="세부 내용을 입력하세요"
                                />
                            </label>
                            <label className="planner-field">
                                <span>날짜</span>
                                <input
                                    type="date"
                                    className="input"
                                    value={todoForm.date}
                                    onChange={(e) => updateTodoForm("date", e.target.value)}
                                />
                            </label>
                            <label className="todo-modal-checkbox">
                                <input
                                    type="checkbox"
                                    checked={todoForm.is_done}
                                    onChange={(e) => updateTodoForm("is_done", e.target.checked)}
                                />
                                <span>완료됨으로 표시</span>
                            </label>
                            <div className="planner-form-actions">
                                <button type="button" className="ghost-pill" onClick={closeTodoModal}>
                                    취소
                                </button>
                                <button type="submit" className="btn" disabled={!todoForm.title.trim()}>
                                    변경 저장
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </div>
        </div>
    );
}

export default function PlannerPage() {
    return (
        <Suspense fallback={<div className="planner-loading">Loading...</div>}>
            <PlannerContent />
        </Suspense>
    );
}
