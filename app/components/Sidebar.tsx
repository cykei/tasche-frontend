"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, CalendarDays, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { api, Project } from "../lib/api";
import Modal from "./Modal";

export default function Sidebar() {
    const pathname = usePathname();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");

    useEffect(() => {
        api.projects.list().then(setProjects).catch(console.error);
    }, []);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName) return;
        try {
            const p = await api.projects.create({ name: newProjectName, color: "#808080" });
            setProjects([...projects, p]);
            setIsProjectModalOpen(false);
            setNewProjectName("");
        } catch (e) { console.error(e); }
    };

    return (
        <div className="w-[260px] bg-white m-4 rounded-xl border border-gray-200 flex flex-col pt-6 pb-4 px-4 h-[calc(100vh-2rem)] shadow-sm">
            {/* User / Top Bar */}
            <div className="flex items-center gap-3 mb-8 px-2">
                <div className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    T
                </div>
                <span className="font-bold text-gray-800 text-lg tracking-tight">Tasche</span>
            </div>

            {/* Main Nav */}
            <div className="space-y-1 mb-8">
                <NavItem href="/daily" icon={<Calendar size={18} />} label="Todo List" active={pathname === '/daily'} count={2} />
                <NavItem href="/planner" icon={<CalendarDays size={18} />} label="Calendar" active={pathname === '/planner'} />
            </div>

            {/* Projects */}
            <div className="flex-1 overflow-auto">
                <div className="flex items-center justify-between px-2 mb-2 group">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</span>
                    <button onClick={() => setIsProjectModalOpen(true)} className="text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100">
                        <Plus size={14} />
                    </button>
                </div>
                <div className="space-y-0.5">
                    {projects.map(p => (
                        <Link key={p.id} href={`/planner?project=${p.id}`} className="sidebar-link group">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || '#9CA3AF' }} />
                                <span className="truncate group-hover:text-gray-900">{p.name}</span>
                            </div>
                        </Link>
                    ))}
                    {projects.length === 0 && <div className="px-2 text-xs text-gray-400">No projects</div>}
                </div>
            </div>

            <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="Add Project">
                <form onSubmit={handleCreateProject} className="space-y-4">
                    <input className="input" placeholder="Name" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} autoFocus />
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setIsProjectModalOpen(false)} className="btn-ghost">Cancel</button>
                        <button type="submit" className="btn">Add</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function NavItem({ href, icon, label, active, count }: { href: string, icon: React.ReactNode, label: string, active?: boolean, count?: number }) {
    return (
        <Link href={href} className={`sidebar-link ${active ? 'active' : ''}`}>
            <div className="flex items-center gap-3">
                <span className={`${active ? 'text-red-500' : 'text-gray-400'}`}>{icon}</span>
                {label}
            </div>
            {count && <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">{count}</span>}
        </Link>
    )
}
