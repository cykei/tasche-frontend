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
        <aside className="sidebar-panel">
            {/* Brand */}
            <div className="sidebar-brand">
                <div className="brand-avatar">T</div>
                <div>
                    <p className="brand-title">Tasche</p>
                    <span className="brand-subtitle">오늘의 집중 공간</span>
                </div>
            </div>

            {/* Main Nav */}
            <nav className="sidebar-section">
                <p className="section-label">작업</p>
                <NavItem href="/daily" icon={<Calendar size={18} />} label="오늘" active={pathname === "/daily"} />
                <NavItem href="/planner" icon={<CalendarDays size={18} />} label="캘린더" active={pathname === "/planner"} />
            </nav>

            {/* Projects */}
            <div className="sidebar-section sidebar-scroll">
                <div className="section-header">
                    <p className="section-label">프로젝트</p>
                    <button
                        onClick={() => setIsProjectModalOpen(true)}
                        className="ghost-pill compact"
                        aria-label="프로젝트 추가"
                    >
                        <Plus size={14} />
                    </button>
                </div>
                <div className="project-list">
                    {projects.map((p) => (
                        <Link key={p.id} href={`/planner?project=${p.id}`} className="project-chip">
                            <span className="project-dot" style={{ backgroundColor: p.color || "#9CA3AF" }} />
                            <span className="project-name">{p.name}</span>
                        </Link>
                    ))}
                    {projects.length === 0 && <div className="project-empty">아직 프로젝트가 없어요</div>}
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
        </aside>
    );
}

function NavItem({ href, icon, label, active, count }: { href: string, icon: React.ReactNode, label: string, active?: boolean, count?: number }) {
    return (
        <Link href={href} className={`sidebar-link ${active ? "active" : ""}`}>
            <div className="sidebar-link-content">
                <span className="sidebar-link-icon">{icon}</span>
                <span className="sidebar-link-label">{label}</span>
            </div>
            {count && <span className="sidebar-count-pill">{count}</span>}
        </Link>
    );
}
