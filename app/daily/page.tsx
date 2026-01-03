"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { ko } from "date-fns/locale";
import {
    Calendar,
    CalendarPlus,
    Check,
    ChevronLeft,
    ChevronRight,
    Filter,
    MoreHorizontal,
    PlusCircle,
    Tag,
    Trash2,
} from "lucide-react";
import { api, Todo } from "../lib/api";
import Modal from "../components/Modal";

export default function DailyPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [todos, setTodos] = useState<Todo[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [showCompleted, setShowCompleted] = useState(true);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [isTagDeleteModalOpen, setIsTagDeleteModalOpen] = useState(false);
    const [tagToDelete, setTagToDelete] = useState<string | null>(null);

    // Create Form State
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);

    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editTagInput, setEditTagInput] = useState("");
    const [showEditTagSuggestions, setShowEditTagSuggestions] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    const fetchTodos = useCallback(async () => {
        setIsLoading(true);
        try {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const data = await api.todos.list(dateStr);
            setTodos(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate]);

    const fetchTags = useCallback(async () => {
        try {
            const data = await api.tags.list();
            setAllTags(data);
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        fetchTodos();
    }, [fetchTodos]);

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    const resetForm = () => {
        setTitle("");
        setContent("");
        setTags([]);
        setTagInput("");
    };

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key !== "Enter") return;
        const nextTag = tagInput.trim();
        if (!nextTag) return;
        e.preventDefault();
        if (!tags.includes(nextTag)) {
            setTags([...tags, nextTag]);
        }
        setTagInput("");
    };

    const removeTag = (t: string) => setTags(tags.filter((tag) => tag !== t));

    const addSuggestedTag = (tag: string) => {
        if (!tags.includes(tag)) {
            setTags([...tags, tag]);
        }
        setTagInput("");
        setShowTagSuggestions(false);
    };

    const handleEditTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key !== "Enter") return;
        const nextTag = editTagInput.trim();
        if (!nextTag) return;
        e.preventDefault();
        if (!editTags.includes(nextTag)) {
            setEditTags([...editTags, nextTag]);
        }
        setEditTagInput("");
    };

    const removeEditTag = (tag: string) => {
        setEditTags(editTags.filter((t) => t !== tag));
    };

    const addSuggestedEditTag = (tag: string) => {
        if (!editTags.includes(tag)) {
            setEditTags([...editTags, tag]);
        }
        setEditTagInput("");
        setShowEditTagSuggestions(false);
    };

    const handleAddTodo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        try {
            await api.todos.create({
                title: title,
                content: content,
                date: format(selectedDate, "yyyy-MM-dd"),
                tags: tags,
            });
            resetForm();
            setIsAdding(false);
            await Promise.all([fetchTodos(), fetchTags()]);
        } catch (error) {
            console.error(error);
        }
    };

    const openTagDeleteModal = (tag: string) => {
        setTagToDelete(tag);
        setIsTagDeleteModalOpen(true);
    };

    const closeTagDeleteModal = () => {
        setIsTagDeleteModalOpen(false);
        setTagToDelete(null);
    };

    const handleDeleteTag = async () => {
        if (!tagToDelete) return;
        try {
            await api.tags.delete(tagToDelete);
            if (selectedTag === tagToDelete) {
                setSelectedTag(null);
            }
            await Promise.all([fetchTodos(), fetchTags()]);
            closeTagDeleteModal();
        } catch (error) {
            console.error(error);
        }
    };

    const cancelAddTodo = () => {
        resetForm();
        setIsAdding(false);
    };

    const toggleTodo = async (todo: Todo) => {
        try {
            if (editingTodo?.id === todo.id) cancelEditTodo();
            setTodos(todos.map((t) => (t.id === todo.id ? { ...t, is_done: !t.is_done } : t)));
            await api.todos.update(todo.id, { is_done: !todo.is_done });
        } catch {
            fetchTodos();
        }
    };

    const deleteTodo = async (id: number) => {
        if (!confirm("Delete?")) return;
        await api.todos.delete(id);
        setTodos(todos.filter((t) => t.id !== id));
        if (editingTodo?.id === id) cancelEditTodo();
    };

    const startEditTodo = (todo: Todo) => {
        setEditingTodo(todo);
        setEditTitle(todo.title);
        setEditContent(todo.content ?? "");
        setEditTags(todo.tags ?? []);
        setEditTagInput("");
    };

    const cancelEditTodo = () => {
        setEditingTodo(null);
        setEditTitle("");
        setEditContent("");
        setEditTags([]);
        setEditTagInput("");
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTodo || !editTitle.trim()) return;
        try {
            const updated = await api.todos.update(editingTodo.id, {
                title: editTitle.trim(),
                content: editContent,
                tags: editTags,
            });
            setTodos(prev => prev.map(todo => (todo.id === updated.id ? updated : todo)));
            await fetchTags();
            cancelEditTodo();
        } catch (error) {
            console.error(error);
        }
    };

    const filteredTodos = useMemo(() => {
        if (!selectedTag) return todos;
        return todos.filter(todo => todo.tags?.includes(selectedTag));
    }, [todos, selectedTag]);

    const activeTodos = filteredTodos.filter((t) => !t.is_done);
    const completedTodos = filteredTodos.filter((t) => t.is_done);
    const totalTodos = filteredTodos.length;
    const progress = totalTodos ? Math.round((completedTodos.length / totalTodos) * 100) : 0;

    const heroDate = format(selectedDate, "PPP", { locale: ko });
    const heroWeekday = format(selectedDate, "EEEE", { locale: ko });
    const dueLabel = format(selectedDate, "M월 d일 (EEE)", { locale: ko });

    const summaryStats = useMemo(
        () => [
            { label: "오늘 남은 작업", value: `${activeTodos.length}개`, hint: "지금 바로 처리해보세요." },
            { label: "완료된 작업", value: `${completedTodos.length}개`, hint: "목표에 한 걸음 더 다가갔어요." },
            { label: "선택한 날짜", value: heroDate, hint: heroWeekday },
        ],
        [activeTodos.length, completedTodos.length, heroDate, heroWeekday],
    );

    const tagOptions = useMemo(() => allTags, [allTags]);

    const tagSuggestions = useMemo(() => {
        const keyword = tagInput.trim().toLowerCase();
        return tagOptions.filter((tag) => {
            if (tags.includes(tag)) return false;
            if (!keyword) return true;
            return tag.toLowerCase().includes(keyword);
        });
    }, [tagInput, tagOptions, tags]);

    const editTagSuggestions = useMemo(() => {
        const keyword = editTagInput.trim().toLowerCase();
        return tagOptions.filter((tag) => {
            if (editTags.includes(tag)) return false;
            if (!keyword) return true;
            return tag.toLowerCase().includes(keyword);
        });
    }, [editTagInput, editTags, tagOptions]);

    const formatCreatedAt = (value?: string) => {
        if (!value) return "";
        const hasTimezone = value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value);
        const parseUtc = () => {
            if (hasTimezone) return new Date(value);
            const [datePart, timePartRaw] = value.replace("T", " ").split(" ");
            if (!datePart || !timePartRaw) return new Date(value);
            const [year, month, day] = datePart.split("-").map(Number);
            const timePart = timePartRaw.split(".")[0];
            const [hour, minute, second = "0"] = timePart.split(":");
            return new Date(Date.UTC(
                year,
                (month ?? 1) - 1,
                day ?? 1,
                Number(hour ?? 0),
                Number(minute ?? 0),
                Number(second ?? 0),
            ));
        };
        const date = parseUtc();
        if (isNaN(date.getTime())) return "";
        return new Intl.DateTimeFormat("ko-KR", {
            timeZone: "Asia/Seoul",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        }).format(date);
    };

    const shiftDay = (amount: number) => setSelectedDate(addDays(selectedDate, amount));

    const renderTodoContent = (content?: string) => {
        if (!content) return null;
        const lines = content.split(/\r?\n/);
        return (
            <div className="todoist-task-desc">
                {lines.map((line, index) => (
                    <span
                        key={`${index}-${line}`}
                        className={`todoist-desc-line${line ? "" : " todoist-desc-empty"}`}
                    >
                        {line}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="today-page">
            <div className="today-grid">
                <section className="today-content">
                    <header className="today-hero card">
                        <div>
                            <p className="today-eyebrow">Today</p>
                            <h1>{heroWeekday}</h1>
                            <p className="hero-date-line">
                                <Calendar size={14} />
                                {heroDate}
                                <span className="hero-divider" />
                                <span className="hero-active-count">{activeTodos.length}개의 작업 진행중</span>
                            </p>
                        </div>
                        <div className="hero-actions">
                            <div className="date-switcher">
                                <button className="icon-button" onClick={() => shiftDay(-1)} aria-label="이전 날">
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="date-switcher-label">{format(selectedDate, "yyyy.MM.dd")}</span>
                                <button className="icon-button" onClick={() => shiftDay(1)} aria-label="다음 날">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                            <div className="hero-buttons">
                                <button className="ghost-pill" onClick={() => setSelectedDate(new Date())}>
                                    오늘로 이동
                                </button>
                                <button className="ghost-pill">
                                    <Filter size={14} />
                                    필터
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="quick-filter-row">
                        <button
                            className={`quick-filter ${selectedTag === null ? "active" : ""}`}
                            onClick={() => setSelectedTag(null)}
                            type="button"
                        >
                            전체
                        </button>
                        {tagOptions.length === 0 ? (
                            <span className="tag-filter-empty">등록된 태그가 없습니다</span>
                        ) : (
                            tagOptions.map(tag => (
                                <button
                                    key={tag}
                                    className={`quick-filter ${selectedTag === tag ? "active" : ""}`}
                                    onClick={() => openTagDeleteModal(tag)}
                                    type="button"
                                >
                                    #{tag}
                                </button>
                            ))
                        )}
                    </div>

                    <section className="today-card">
                        <div className="section-header">
                            <div>
                                <h2>오늘</h2>
                                <p className="section-sub">{dueLabel}</p>
                            </div>
                            <div className="section-meta">
                                <span>{activeTodos.length}개의 할 일</span>
                                {isLoading && <span className="loading-dot" />}
                            </div>
                        </div>

                        <div className="todoist-list">
                            {activeTodos.length === 0 && !isAdding ? (
                                <div className="todoist-empty">
                                    <h3>오늘은 여유롭네요!</h3>
                                    <p>새로운 작업을 추가하거나 내일 일정도 미리 계획해보세요.</p>
                                </div>
                            ) : (
                                activeTodos.map((todo) => {
                                    const createdLabel = formatCreatedAt(todo.created_at);
                                    const isEditing = editingTodo?.id === todo.id;
                                    return (
                                        <div key={todo.id} className={`todoist-task ${isEditing ? "editing" : ""}`}>
                                            {isEditing ? (
                                                <form className="todoist-edit-form" onSubmit={handleEditSubmit}>
                                                    <input
                                                        className="todoist-input"
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        placeholder="작업 이름"
                                                        autoFocus
                                                    />
                                                    <textarea
                                                        className="todoist-textarea"
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        placeholder="세부 내용을 입력하세요"
                                                        rows={3}
                                                    />
                                                    <div className="tag-input-row">
                                                        <div className="tag-input-shell">
                                                            {editTags.map((tag) => (
                                                                <span key={tag} className="tag-pill">
                                                                    {tag}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeEditTag(tag)}
                                                                        aria-label="태그 제거"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </span>
                                                            ))}
                                                            <div className="tag-inline-input">
                                                                <Tag size={12} />
                                                                <input
                                                                    placeholder="태그 입력 후 Enter"
                                                                    value={editTagInput}
                                                                    onChange={(e) => setEditTagInput(e.target.value)}
                                                                    onKeyDown={handleEditTagKeyDown}
                                                                    onFocus={() => setShowEditTagSuggestions(true)}
                                                                    onBlur={() => setShowEditTagSuggestions(false)}
                                                                />
                                                                {showEditTagSuggestions && editTagSuggestions.length > 0 && (
                                                                    <div className="tag-suggest-list">
                                                                        {editTagSuggestions.map((tag) => (
                                                                            <button
                                                                                key={tag}
                                                                                type="button"
                                                                                className="tag-suggest-item"
                                                                                onMouseDown={(e) => {
                                                                                    e.preventDefault();
                                                                                    addSuggestedEditTag(tag);
                                                                                }}
                                                                            >
                                                                                #{tag}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="todoist-edit-actions">
                                                        <button
                                                            type="button"
                                                            className="ghost-pill"
                                                            onClick={cancelEditTodo}
                                                        >
                                                            취소
                                                        </button>
                                                        <button type="submit" className="btn" disabled={!editTitle.trim()}>
                                                            저장
                                                        </button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="todoist-checkbox"
                                                        onClick={() => toggleTodo(todo)}
                                                        aria-label="작업 완료 처리"
                                                    >
                                                        <span className="checkbox-ring" />
                                                    </button>
                                                    <div className="todoist-task-body">
                                                        <div className="todoist-task-header">
                                                    <div>
                                                        <p className="todoist-task-title">{todo.title}</p>
                                                        {renderTodoContent(todo.content)}
                                                        {todo.tags && todo.tags.length > 0 && (
                                                            <div className="todoist-tag-list">
                                                                {todo.tags.map((tag) => (
                                                                    <span key={tag} className="todoist-tag-chip">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                            <div className="todoist-task-actions">
                                                                <button
                                                                    className="icon-button muted"
                                                                    type="button"
                                                                    onClick={() => startEditTodo(todo)}
                                                                    aria-label="작업 수정"
                                                                >
                                                                    <MoreHorizontal size={16} />
                                                                </button>
                                                                <button
                                                                    className="icon-button danger"
                                                                    type="button"
                                                                    onClick={() => deleteTodo(todo.id)}
                                                                    aria-label="작업 삭제"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="todoist-task-meta">
                                                            {createdLabel && (
                                                                    <span className="todoist-created">
                                                                    <CalendarPlus size={12} />
                                                                    {createdLabel}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {!isAdding ? (
                            <button className="todoist-quick-add" onClick={() => setIsAdding(true)} type="button">
                                <PlusCircle size={18} />
                                작업 추가
                            </button>
                        ) : (
                            <form onSubmit={handleAddTodo} className="todoist-add-card">
                                <input
                                    className="todoist-input"
                                    placeholder="작업 이름"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    autoFocus
                                />
                                <textarea
                                    className="todoist-textarea"
                                    placeholder="세부 내용을 입력하세요"
                                    rows={3}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />

                                <div className="tag-input-row">
                                    <div className="tag-input-shell">
                                        {tags.map((t) => (
                                            <span key={t} className="tag-pill">
                                                {t}
                                                <button type="button" onClick={() => removeTag(t)} aria-label="태그 제거">
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                        <div className="tag-inline-input">
                                            <Tag size={12} />
                                            <input
                                                placeholder="태그 입력 후 Enter"
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={handleAddTag}
                                                onFocus={() => setShowTagSuggestions(true)}
                                                onBlur={() => setShowTagSuggestions(false)}
                                            />
                                            {showTagSuggestions && tagSuggestions.length > 0 && (
                                                <div className="tag-suggest-list">
                                                    {tagSuggestions.map((tag) => (
                                                        <button
                                                            key={tag}
                                                            type="button"
                                                            className="tag-suggest-item"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                addSuggestedTag(tag);
                                                            }}
                                                        >
                                                            #{tag}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="todoist-add-actions">
                                        <button type="button" className="ghost-pill" onClick={cancelAddTodo}>
                                            취소
                                        </button>
                                        <button type="submit" className="btn" disabled={!title.trim()}>
                                            추가
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {completedTodos.length > 0 && (
                            <div className="completed-block">
                                <button
                                    type="button"
                                    className="completed-toggle"
                                    onClick={() => setShowCompleted(!showCompleted)}
                                >
                                    완료된 작업 {completedTodos.length}개
                                    <ChevronRight
                                        size={16}
                                        className={`toggle-icon ${showCompleted ? "open" : ""}`}
                                    />
                                </button>
                                {showCompleted && (
                                    <div className="completed-list">
                                        {completedTodos.map((todo) => (
                                            <div key={todo.id} className="completed-item">
                                                <button
                                                    type="button"
                                                    className="todoist-checkbox checked"
                                                    onClick={() => toggleTodo(todo)}
                                                    aria-label="작업 다시 열기"
                                                >
                                                    <Check size={12} strokeWidth={3} />
                                                </button>
                                                <div className="completed-body">
                                                    <p>{todo.title}</p>
                                                    {renderTodoContent(todo.content)}
                                                    {todo.tags && todo.tags.length > 0 && (
                                                        <div className="todoist-tag-list">
                                                            {todo.tags.map((tag) => (
                                                                <span key={tag} className="todoist-tag-chip">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </section>

                <aside className="today-side-panel">
                    <div className="side-card">
                        <div className="side-card-head">
                            <p>오늘 진행률</p>
                            <strong>{progress}%</strong>
                        </div>
                        <div className="progress-track">
                            <div className="progress-bar" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="side-card-caption">
                            총 {totalTodos}개의 작업 중 {completedTodos.length}개 완료
                        </p>
                    </div>

                    <div className="side-card">
                        <div className="side-card-head">
                            <p>요약</p>
                        </div>
                        <ul className="summary-list">
                            {summaryStats.map((stat) => (
                                <li key={stat.label}>
                                    <p>{stat.label}</p>
                                    <strong>{stat.value}</strong>
                                    <span>{stat.hint}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
            </div>
            <Modal
                isOpen={isTagDeleteModalOpen}
                onClose={closeTagDeleteModal}
                title="태그 삭제"
            >
                <p className="planner-modal-desc">
                    {tagToDelete ? `"${tagToDelete}" 태그를 삭제할까요?` : "태그를 삭제할까요?"}
                </p>
                <div className="planner-modal-actions">
                    <button type="button" className="ghost-pill" onClick={closeTagDeleteModal}>
                        취소
                    </button>
                    <button type="button" className="btn danger" onClick={handleDeleteTag}>
                        삭제
                    </button>
                </div>
            </Modal>
        </div>
    );
}
