import { memo, useMemo } from "react";
import type { Staff } from "../../../domain/models";
import { formatCurrency, formatRole } from "../../../utils/formatters";
import { EmptyState } from "../../common/EmptyState";

interface EnrichedStaff extends Staff {
    fullName: string;
    formattedRole: string;
    formattedSpecialization: string;
    formattedSalary: string;
}

const StaffRow = memo(({ member }: { member: EnrichedStaff }) => {
    return (
        <tr className="hover:bg-slate-800/50 transition-colors">
            <td className="p-4 font-medium text-slate-200">
                {member.fullName}
            </td>
            <td className="p-4 text-slate-300">
                {member.formattedRole}
            </td>
            <td className="p-4 text-center text-slate-400">
                {member.age}
            </td>
            <td className="p-4 text-center">
                <div className="inline-block px-2 py-1 rounded bg-slate-800 font-bold text-white border border-slate-700">
                    {member.overall}
                </div>
            </td>
            <td className="p-4 text-slate-400 italic">
                {member.formattedSpecialization}
            </td>
            <td className="p-4 text-right text-slate-300 font-mono text-xs">
                {member.formattedSalary}/ano
            </td>
        </tr>
    );
});

StaffRow.displayName = "StaffRow";

function StaffTable({ staff }: { staff: Staff[] }) {
    const enrichedStaff = useMemo(() => {
        return staff.map((member): EnrichedStaff => ({
            ...member,
            fullName: `${member.firstName} ${member.lastName}`,
            formattedRole: formatRole(member.role),
            formattedSpecialization: member.specialization
                ? formatRole(member.specialization)
                : '-',
            formattedSalary: formatCurrency(member.salary)
        }));
    }, [staff]);

    if (staff.length === 0) {
        return (
            <div className="bg-slate-900/50 rounded-lg border border-slate-800">
                <EmptyState
                    icon={<span className="text-4xl">👔</span>}
                    title="Equipa Técnica Vazia"
                    description="Não existem membros na equipa técnica. Contrate profissionais para melhorar o rendimento do clube."
                />
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-xs uppercase font-semibold text-slate-400">
                    <tr>
                        <th className="p-4">Nome</th>
                        <th className="p-4">Cargo</th>
                        <th className="p-4 text-center">Idade</th>
                        <th className="p-4 text-center">Habilidade</th>
                        <th className="p-4">Especialização</th>
                        <th className="p-4 text-right">Salário</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {enrichedStaff.map((member) => (
                        <StaffRow key={member.id} member={member} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default memo(StaffTable);