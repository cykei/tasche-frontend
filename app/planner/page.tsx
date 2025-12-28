"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { api, Project, PlanEvent } from "../lib/api";
import Modal from "../components/Modal";
import CalendarHelper from "../components/CalendarHelper"; // The new FullCalendar wrapper

export default function PlannerPage() {
    // Calendar state is now largely managed by FullCalendar internally for view, 
    // but we still fetch events based on a broad range or just all events for now.

    const [projects, setProjects] = useState<Project[]>([]);
    const [events, setEvents] = useState<PlanEvent[]>([]);

    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

    // Selected Data for Creation
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Forms
    const [newEventTitle, setNewEventTitle] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectColor, setNewProjectColor] = useState("#4285F4");

    const fetchProjects = useCallback(async () => {
        try {
            const data = await api.projects.list();
            setProjects(data);
            if (data.length > 0) {
                setSelectedProjectId((prev) => prev ?? data[0].id);
            }
        } catch (e) { console.error(e); }
    }, []);

    const fetchEvents = useCallback(async () => {
        // For MVP fetching all or a large range. FC handles view.
        try {
            const data = await api.events.list();
            setEvents(data);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        const load = async () => {
            await fetchProjects();
            await fetchEvents();
        };
        void load();
    }, [fetchProjects, fetchEvents]);

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !selectedProjectId || !newEventTitle) return;
        try {
            await api.events.create({
                project_id: selectedProjectId!,
                title: newEventTitle,
                start_at: selectedDate.toISOString(),
                end_at: selectedDate.toISOString(),
                is_all_day: true,
                note: ""
            });
            setIsEventModalOpen(false);
            setNewEventTitle("");
            fetchEvents();
        } catch (e) { console.error(e); }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName) return;
        try {
            const p = await api.projects.create({
                name: newProjectName,
                color: newProjectColor,
                description: ""
            });
            setProjects([...projects, p]);
            setIsProjectModalOpen(false);
            setNewProjectName("");
            if (!selectedProjectId) setSelectedProjectId(p.id);
        } catch (e) { console.error(e); }
    };

    const handleDeleteProject = async (id: number) => {
        if (!confirm("Delete this project and all its events?")) return;
        await api.projects.delete(id);
        fetchProjects();
        fetchEvents();
    }

    // Handlers for FullCalendar
    const onDateClick = (date: Date) => {
        setSelectedDate(date);
        setIsEventModalOpen(true);
    };

    const onEventClick = async (event: PlanEvent) => {
        if (confirm(`Delete event "${event.title}"?`)) {
            await api.events.delete(event.id);
            fetchEvents();
        }
    };

    return (
        <div className="flex h-full bg-white">
            {/* Sidebar: Projects */}
            <aside className="w-60 border-r p-6 flex flex-col gap-6" style={{ borderColor: 'hsl(var(--border))' }}>
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-700">Projects</h2>
                    <button onClick={() => setIsProjectModalOpen(true)} className="p-1 hover:bg-gray-100 rounded text-blue-600"><Plus size={20} /></button>
                </div>
                <div className="space-y-1 overflow-auto flex-1">
                    {projects.map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 group transition-colors">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                            <span className="flex-1 text-sm font-medium text-gray-700 truncate">{p.name}</span>
                            <button onClick={() => handleDeleteProject(p.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {projects.length === 0 && <div className="text-xs opacity-50 text-center py-4">No projects yet.</div>}
                </div>
            </aside>

            {/* Main: FullCalendar */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
                <CalendarHelper
                    events={events}
                    projects={projects}
                    onDateClick={onDateClick}
                    onEventClick={onEventClick}
                />
            </div>

            {/* Modals */}
            <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title="Add Event">
                <form onSubmit={handleCreateEvent} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Project</label>
                        <select
                            className="input h-10 bg-gray-50 border border-gray-200"
                            value={selectedProjectId || ""}
                            onChange={e => setSelectedProjectId(Number(e.target.value))}
                        >
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        {projects.length === 0 && <p className="text-xs text-red-500 mt-1">Create a project first!</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Title</label>
                        <input
                            className="input h-10 bg-gray-50 border border-gray-200"
                            value={newEventTitle}
                            onChange={e => setNewEventTitle(e.target.value)}
                            placeholder="Event name..."
                            autoFocus
                        />
                    </div>
                    <div className="text-sm text-gray-500">
                        Date: {selectedDate && format(selectedDate, "PPP")}
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={() => setIsEventModalOpen(false)} className="btn-ghost px-4 py-2 rounded">Cancel</button>
                        <button type="submit" className="btn" disabled={projects.length === 0}>Create</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="New Project">
                <form onSubmit={handleCreateProject} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Name</label>
                        <input className="input h-10 bg-gray-50 border border-gray-200" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Project name..." autoFocus />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#F439A0', '#A142F4', '#24C1E0'].map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setNewProjectColor(c)}
                                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${newProjectColor === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                            <input type="color" className="w-6 h-6 p-0 border-0 rounded-full overflow-hidden" value={newProjectColor} onChange={e => setNewProjectColor(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={() => setIsProjectModalOpen(false)} className="btn-ghost px-4 py-2 rounded">Cancel</button>
                        <button type="submit" className="btn">Create</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
