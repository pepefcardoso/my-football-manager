import { useEffect, useState } from "react";
import { formatCurrency } from "../../../utils/formatters";
import { Logger } from "../../../lib/Logger";
import { LoadingSpinner } from "../../common/Loading";

const logger = new Logger("RevenueProjectionPanel");

interface RevenueProjectionData {
    matchday: {
        homeMatches: number;
        averageAttendance: number;
        totalRevenue: number;
    };
    broadcasting: {
        baseRights: number;
        performanceBonus: number;
        totalRevenue: number;
    };
    commercial: {
        shirtSponsor: number;
        kitManufacturer: number;
        stadiumNaming: number;
        regionalSponsors: number;
        socialMedia: number;
        totalRevenue: number;
    };
    prizeMoney: {
        leaguePosition: number;
        cupCompetitions: number;
        totalRevenue: number;
    };
    grandTotal: number;
    revenuePerPlayer: number;
}

interface RevenueProjectionPanelProps {
    teamId: number;
}

export function RevenueProjectionPanel({ teamId }: RevenueProjectionPanelProps) {
    const [data, setData] = useState<RevenueProjectionData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await window.electronAPI.finance.projectAnnualRevenue(teamId, 10, 19);
                setData(result);
            } catch (error) {
                logger.error("Error fetching revenue projection:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [teamId]);

    if (loading) {
        return <LoadingSpinner size="md" centered={true} />;
    }

    if (!data) {
        return (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 text-red-400">
                Failed to load revenue projection data
            </div>
        );
    }

    const RevenueCard = ({
        title,
        icon,
        items,
        total,
        percentage
    }: {
        title: string;
        icon: string;
        items: { label: string; value: number }[];
        total: number;
        percentage: number;
    }) => (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                </div>
                <span className="text-sm font-bold text-slate-400">{percentage.toFixed(1)}%</span>
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
                <span className="font-bold text-white">Total</span>
                <span className="font-mono font-bold text-emerald-400">{formatCurrency(total)}</span>
            </div>

            <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-900/20 to-emerald-800/10 border border-emerald-700/50 rounded-lg p-8">
                <h3 className="text-2xl font-bold text-white mb-6">Projected Annual Revenue</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs text-emerald-400 mb-2">Total Projected</p>
                        <p className="text-4xl font-bold text-white">{formatCurrency(data.grandTotal)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 mb-2">Revenue per Player</p>
                        <p className="text-4xl font-bold text-emerald-400">{formatCurrency(data.revenuePerPlayer)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RevenueCard
                    title="Matchday Revenue"
                    icon="🎟️"
                    items={[
                        { label: `${data.matchday.homeMatches} Home Matches`, value: data.matchday.totalRevenue },
                        { label: "Avg. Attendance", value: data.matchday.averageAttendance },
                    ]}
                    total={data.matchday.totalRevenue}
                    percentage={(data.matchday.totalRevenue / data.grandTotal) * 100}
                />

                <RevenueCard
                    title="Broadcasting Rights"
                    icon="📺"
                    items={[
                        { label: "Base Rights", value: data.broadcasting.baseRights },
                        { label: "Performance Bonus", value: data.broadcasting.performanceBonus },
                    ]}
                    total={data.broadcasting.totalRevenue}
                    percentage={(data.broadcasting.totalRevenue / data.grandTotal) * 100}
                />

                <RevenueCard
                    title="Commercial Revenue"
                    icon="🤝"
                    items={[
                        { label: "Shirt Sponsor", value: data.commercial.shirtSponsor },
                        { label: "Kit Manufacturer", value: data.commercial.kitManufacturer },
                        { label: "Stadium Naming", value: data.commercial.stadiumNaming },
                        { label: "Regional Sponsors", value: data.commercial.regionalSponsors },
                        { label: "Social Media", value: data.commercial.socialMedia },
                    ]}
                    total={data.commercial.totalRevenue}
                    percentage={(data.commercial.totalRevenue / data.grandTotal) * 100}
                />

                <RevenueCard
                    title="Prize Money"
                    icon="🏆"
                    items={[
                        { label: "League Position", value: data.prizeMoney.leaguePosition },
                        { label: "Cup Competitions", value: data.prizeMoney.cupCompetitions },
                    ]}
                    total={data.prizeMoney.totalRevenue}
                    percentage={(data.prizeMoney.totalRevenue / data.grandTotal) * 100}
                />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Revenue Distribution</h3>
                <div className="space-y-3">
                    {[
                        { label: "Matchday", value: data.matchday.totalRevenue, color: "bg-blue-500" },
                        { label: "Broadcasting", value: data.broadcasting.totalRevenue, color: "bg-purple-500" },
                        { label: "Commercial", value: data.commercial.totalRevenue, color: "bg-emerald-500" },
                        { label: "Prize Money", value: data.prizeMoney.totalRevenue, color: "bg-yellow-500" },
                    ].map((item) => {
                        const percentage = (item.value / data.grandTotal) * 100;
                        return (
                            <div key={item.label}>
                                <div className="flex justify-between items-center mb-1 text-sm">
                                    <span className="text-slate-400">{item.label}</span>
                                    <span className="font-mono text-white">{formatCurrency(item.value)} ({percentage.toFixed(1)}%)</span>
                                </div>
                                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${item.color} transition-all duration-500`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}