import type { Staff } from "../../../domain/models";
import { formatCurrency, formatRole } from "../../../utils/formatters";

function StaffTable({ staff }: { staff: Staff[] }) {
    if (staff.length === 0) {
        return <div className="text-slate-500 p-4">Nenhum staff contratado.</div>;
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
                    {staff.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="p-4 font-medium text-slate-200">
                                {member.firstName} {member.lastName}
                            </td>
                            <td className="p-4 text-slate-300">
                                {formatRole(member.role)}
                            </td>
                            <td className="p-4 text-center text-slate-400">{member.age}</td>
                            <td className="p-4 text-center">
                                <div className="inline-block px-2 py-1 rounded bg-slate-800 font-bold text-white border border-slate-700">
                                    {member.overall}
                                </div>
                            </td>
                            <td className="p-4 text-slate-400 italic">
                                {member.specialization ? formatRole(member.specialization) : '-'}
                            </td>
                            <td className="p-4 text-right text-slate-300 font-mono text-xs">
                                {formatCurrency(member.salary)}/ano
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default StaffTable;