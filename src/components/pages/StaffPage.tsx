import { useEffect, useState } from "react";
import type { Staff } from "../../domain/models";
import StaffTable from "../features/staff/StaffTable";
import { Logger } from "../../lib/Logger";
import { LoadingSpinner } from "../common/Loading";

const logger = new Logger("StaffPage");

function StaffPage({ teamId }: { teamId: number }) {
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStaff = async () => {
            setLoading(true);
            try {
                const data = await window.electronAPI.staff.getStaff(teamId);
                const sorted = data.sort((a: Staff, b: Staff) => a.role.localeCompare(b.role));
                setStaff(sorted);
            } catch (error) {
                logger.error("Erro ao buscar staff:", error);
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
                <LoadingSpinner size="md" centered={true} />
            ) : (
                <StaffTable staff={staff} />
            )}
        </div>
    );
}

export default StaffPage;