const API_URL = "http://localhost:8080";

export interface Todo {
    id: number;
    title: string;
    content: string;
    is_done: boolean;
    date: string;
    created_at: string;
    updated_at: string;
}

export interface CreateTodo {
    title: string;
    content: string;
    date: string; // YYYY-MM-DD
    tags?: string[];
}

export interface UpdateTodo {
    title?: string;
    content?: string;
    is_done?: boolean;
    date?: string;
}

export interface Project {
    id: number;
    name: string;
    color: string;
    description?: string;
}

export interface PlanEvent {
    id: number;
    project_id: number;
    title: string;
    start_at: string;
    end_at: string;
    is_all_day: boolean;
    note?: string;
}

export const api = {
    todos: {
        list: async (date?: string): Promise<Todo[]> => {
            const query = date ? `?date=${date}` : "";
            const res = await fetch(`${API_URL}/todos${query}`);
            if (!res.ok) throw new Error("Failed to fetch todos");
            return res.json();
        },
        create: async (data: CreateTodo): Promise<Todo> => {
            const res = await fetch(`${API_URL}/todos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create todo");
            return res.json();
        },
        update: async (id: number, data: UpdateTodo): Promise<Todo> => {
            const res = await fetch(`${API_URL}/todos/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update todo");
            return res.json();
        },
        delete: async (id: number): Promise<void> => {
            const res = await fetch(`${API_URL}/todos/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete todo");
        },
    },
    projects: {
        list: async (): Promise<Project[]> => {
            const res = await fetch(`${API_URL}/projects`);
            if (!res.ok) throw new Error("Failed to fetch projects");
            return res.json();
        },
        create: async (data: { name: string, color: string, description?: string }): Promise<Project> => {
            const res = await fetch(`${API_URL}/projects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create project");
            return res.json();
        },
        delete: async (id: number) => {
            await fetch(`${API_URL}/projects/${id}`, { method: "DELETE" });
        }
    },
    events: {
        list: async (start?: string, end?: string): Promise<PlanEvent[]> => {
            const query = start && end ? `?start=${start}&end=${end}` : "";
            const res = await fetch(`${API_URL}/events${query}`);
            if (!res.ok) throw new Error("Failed to fetch events");
            return res.json();
        },
        create: async (data: Omit<PlanEvent, "id" | "created_at" | "updated_at">): Promise<PlanEvent> => {
            const res = await fetch(`${API_URL}/events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create event");
            return res.json();
        },
        delete: async (id: number) => {
            await fetch(`${API_URL}/events/${id}`, { method: "DELETE" });
        }
    }
};
