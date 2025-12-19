import { useEffect, useState } from "react";
import { formatCurrency } from "../../../utils/formatters";
import { Logger } from "../../../lib/Logger";

const logger = new Logger("OperationalCostsPanel");

interface OperationalCostsData {
    stadium: {
        baseMaintenance: number;
        utilities: number;
        security: number;
        cleaning: number;
        totalAnnual: number;
        perMatchDay: number;
    };
    training: {
        facilities: number;
        equipment: number;
        groundskeeping: number;
        totalAnnual: number;
    };
    youth: {
        baseCost: number;
        perPlayerCost: number;
        coachingStaff: number;
        facilities: number;
        totalAnnual: number;
    };
    administrative: {
        staff: number;
        legal: number;
        it: number;
        insurance: number;
        totalAnnual: number;
    };
    medical: {
        staff: number;
        physiotherapy: number;
        equipment: number;
        perPlayer: number;
        totalAnnual: number;
    };
    grandTotal: {
        annualCost: number;
        monthlyCost: number;
        dailyCost: number;
    };
}

interface OperationalCostsPanelProps {
    teamId: number;
}

export function OperationalCostsPanel({ teamId }: OperationalCostsPanelProps) {
    const [data, setData] = useState<OperationalCostsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await window.electronAPI.finance.getOperationalCosts(teamId, 19);
                setData(result);
            } catch (error) {
                logger.error("Error fetching operational costs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [teamId]);

    if (loading) {
        return (
            <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 text-red-400">
                Failed to load operational costs data
            </div>
        );
    }

    const CostCard = ({
        title,
        icon,
        items,
        total
    }: {
        title: string;
        icon: string;
        items: { label: string; value: number }[];
        total: number;
    }) => (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{icon}</span>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
            </div>
            <div className="space-y-2 mb-4">
                {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="font-mono text-slate-300">{formatCurrency(item.value)}</span>
                    </div>
                ))}
            </div>
            <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                <span className="font-bold text-white">Annual Total</span>
                <span className="font-mono font-bold text-emerald-400">{formatCurrency(total)}</span>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-8">
                <h3 className="text-2xl font-bold text-white mb-6">Total Operational Costs</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <p className="text-xs text-slate-500 mb-2">Annual</p>
                        <p className="text-3xl font-bold text-white">{formatCurrency(data.grandTotal.annualCost)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-2">Monthly</p>
                        <p className="text-3xl font-bold text-emerald-400">{formatCurrency(data.grandTotal.monthlyCost)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-2">Daily</p>
                        <p className="text-3xl font-bold text-slate-400">{formatCurrency(data.grandTotal.dailyCost)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CostCard
                    title="Stadium Operations"
                    icon="🏟️"
                    items={[
                        { label: "Base Maintenance", value: data.stadium.baseMaintenance },
                        { label: "Utilities", value: data.stadium.utilities },
                        { label: "Security", value: data.stadium.security },
                        { label: "Cleaning (Matchdays)", value: data.stadium.cleaning },
                    ]}
                    total={data.stadium.totalAnnual}
                />

                <CostCard
                    title="Training Facilities"
                    icon="🏋️"
                    items={[
                        { label: "Facilities Maintenance", value: data.training.facilities },
                        { label: "Equipment", value: data.training.equipment },
                        { label: "Groundskeeping", value: data.training.groundskeeping },
                    ]}
                    total={data.training.totalAnnual}
                />

                <CostCard
                    title="Youth Academy"
                    icon="🎓"
                    items={[
                        { label: "Base Cost", value: data.youth.baseCost },
                        { label: "Per Player", value: data.youth.perPlayerCost },
                        { label: "Coaching Staff", value: data.youth.coachingStaff },
                        { label: "Facilities", value: data.youth.facilities },
                    ]}
                    total={data.youth.totalAnnual}
                />

                <CostCard
                    title="Administrative"
                    icon="📋"
                    items={[
                        { label: "Staff Salaries", value: data.administrative.staff },
                        { label: "Legal & Compliance", value: data.administrative.legal },
                        { label: "IT Systems", value: data.administrative.it },
                        { label: "Insurance", value: data.administrative.insurance },
                    ]}
                    total={data.administrative.totalAnnual}
                />

                <CostCard
                    title="Medical Department"
                    icon="🏥"
                    items={[
                        { label: "Medical Staff", value: data.medical.staff },
                        { label: "Physiotherapy", value: data.medical.physiotherapy },
                        { label: "Equipment & Supplies", value: data.medical.equipment },
                        { label: "Per Player Cost", value: data.medical.perPlayer },
                    ]}
                    total={data.medical.totalAnnual}
                />
            </div>
        </div>
    );
}