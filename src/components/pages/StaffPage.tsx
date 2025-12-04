import { useEffect, useState } from "react";
import type { Staff } from "../../domain/types";
import StaffTable from "../tables/StaffTable";

function StaffPage({ teamId }: { teamId: number }) {
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStaff = async () => {
            setLoading(true);
            try {
                const data = await window.electronAPI.getStaff(teamId);
                const sorted = data.sort((a: Staff, b: Staff) => a.role.localeCompare(b.role));
                setStaff(sorted);
            } catch (error) {
                console.error("Erro ao buscar staff:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStaff();
    }, [teamId]);

    return (
        <div className="p-8">
            <header className="mb-6">
                <h2 className="text-3xl font-light text-white mb-1">Equipa Técnica</h2>
                <p className="text-slate-400 text-sm">
                    Profissionais e Direção
                </p>
            </header>

            {loading ? (
                <div className="flex justify-center p-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
            ) : (
                <StaffTable staff={staff} />
            )}
        </div>
    );
}

export default StaffPage;