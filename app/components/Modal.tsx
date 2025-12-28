import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="planner-modal-overlay">
            <div className="planner-modal-card">
                <header className="planner-modal-header">
                    <h2>{title}</h2>
                    <button onClick={onClose} className="planner-modal-close" aria-label="닫기">
                        <X size={16} />
                    </button>
                </header>
                <div className="planner-modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
}
