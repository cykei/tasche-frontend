"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Calendar, CalendarDays } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, Project } from "../lib/api";

export default function Sidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);

    const selectedProjectId = useMemo(() => {
        const param = searchParams.get("project");
        if (!param) return null;
        const parsed = Number(param);
        return Number.isNaN(parsed) ? null : parsed;
    }, [searchParams]);

    const fetchProjects = useCallback(async () => {
        try {
            const data = await api.projects.list();
            setProjects(data);
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            await fetchProjects();
        };
        void load();

        const handleRefresh = () => {
            void fetchProjects();
        };

        window.addEventListener("projects:refresh", handleRefresh);
        return () => window.removeEventListener("projects:refresh", handleRefresh);
    }, [fetchProjects]);

    const handleProjectClick = (projectId: number) => {
        if (selectedProjectId === projectId) {
            router.push("/planner");
            return;
        }
        router.push(`/planner?project=${projectId}`);
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
                <p className="section-label">프로젝트</p>
                <div className="project-list">
                    {projects.map((project) => (
                        <button
                            key={project.id}
                            type="button"
                            onClick={() => handleProjectClick(project.id)}
                            className={`project-chip ${selectedProjectId === project.id ? "active" : ""}`}
                        >
                            <span className="project-dot" style={{ backgroundColor: project.color || "#9CA3AF" }} />
                            <span className="project-name">{project.name}</span>
                        </button>
                    ))}
                    {projects.length === 0 && <div className="project-empty">아직 프로젝트가 없어요</div>}
                </div>
            </div>

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
