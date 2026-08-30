import WidgetKit
import SwiftUI

struct WidgetDataModel: Codable {
    // Investments
    let portfolioValue: String             // Current Value (e.g. "₹4,25,800" or "-₹10,000")
    let portfolioInvested: String          // Invested (e.g. "₹3,57,400")
    let portfolioDayChange: String         // 1D Return % (e.g. "+2.15%" or "-2.15%")
    let portfolioDayAmount: String         // 1D Return Amount (e.g. "+₹8,970" or "-₹8,970")
    let portfolioTotalReturn: String       // Total Return Amount (e.g. "+₹68,400" or "-₹68,400")
    let portfolioTotalReturnPct: String    // Total Return % (e.g. "+19.2%" or "-19.2%")
    let portfolioXirr: String              // XIRR % (e.g. "24.8%" or "-12.4%")
    let portfolioIsPositive: Bool
    let totalReturnIsPositive: Bool
    let xirrIsPositive: Bool

    // Money Manager
    let netWorth: String                   // Net Worth (e.g. "₹5,62,400" or "-₹25,000")
    let monthlyIncome: String              // Income (e.g. "₹50,000")
    let monthlySpend: String               // Spend (e.g. "₹16,200")
    let monthlyNetSavings: String          // Net Saved (e.g. "+₹33,800" or "-₹12,400")
    let monthlySavingsRate: String         // Savings Rate (e.g. "34%" or "-20%")
    let netSavingsIsPositive: Bool

    // Metadata
    let lastUpdated: Double
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let data: WidgetDataModel
}

struct Provider: TimelineProvider {
    let appGroup = "group.com.akashsharma.gainbase"

    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), data: defaultData)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        completion(SimpleEntry(date: Date(), data: loadData()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = SimpleEntry(date: Date(), data: loadData())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadData() -> WidgetDataModel {
        guard let userDefaults = UserDefaults(suiteName: appGroup),
              let jsonString = userDefaults.string(forKey: "gainbase_widget_data"),
              let jsonData = jsonString.data(using: .utf8),
              let decoded = try? JSONDecoder().decode(WidgetDataModel.self, from: jsonData) else {
            return defaultData
        }
        return decoded
    }

    private var defaultData: WidgetDataModel {
        WidgetDataModel(
            portfolioValue: "₹4,25,800",
            portfolioInvested: "₹3,57,400",
            portfolioDayChange: "+2.15%",
            portfolioDayAmount: "+₹8,970",
            portfolioTotalReturn: "+₹68,400",
            portfolioTotalReturnPct: "+19.2%",
            portfolioXirr: "24.8%",
            portfolioIsPositive: true,
            totalReturnIsPositive: true,
            xirrIsPositive: true,
            netWorth: "₹5,62,400",
            monthlyIncome: "₹50,000",
            monthlySpend: "₹16,200",
            monthlyNetSavings: "+₹33,800",
            monthlySavingsRate: "34%",
            netSavingsIsPositive: true,
            lastUpdated: Date().timeIntervalSince1970
        )
    }
}

// ═══════════════════════════════════════════════════════════════
// 1. INVESTMENTS WIDGET (Dedicated Stock Portfolio)
// ═══════════════════════════════════════════════════════════════
struct InvestmentsWidgetEntryView : View {
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                // ─── Small 2x2 Investments Widget ───
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 4) {
                        Circle().fill(Color(red: 0.04, green: 0.52, blue: 1.0)).frame(width: 7, height: 7)
                        Text("INVESTMENTS")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(Color(red: 0.04, green: 0.52, blue: 1.0))
                            .tracking(0.3)
                            .lineLimit(1)
                        Spacer()
                        Text("XIRR \(entry.data.portfolioXirr)")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(entry.data.xirrIsPositive ? Color(red: 0.04, green: 0.52, blue: 1.0) : Color(red: 1.0, green: 0.23, blue: 0.19))
                            .cornerRadius(4)
                            .lineLimit(1)
                    }

                    Spacer()

                    VStack(alignment: .leading, spacing: 1) {
                        Text("CURRENT VALUE")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                        Text(entry.data.portfolioValue)
                            .font(.system(size: 19, weight: .heavy, design: .rounded))
                            .foregroundColor(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.65)
                    }

                    Spacer()

                    VStack(spacing: 3) {
                        HStack {
                            Text("Invested:")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Spacer()
                            Text(entry.data.portfolioInvested)
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(.white)
                                .lineLimit(1)
                        }

                        HStack {
                            Text("1D Return:")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Spacer()
                            Text(entry.data.portfolioDayChange)
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(entry.data.portfolioIsPositive ? Color(red: 0.0, green: 0.79, blue: 0.65) : Color(red: 1.0, green: 0.23, blue: 0.19))
                                .lineLimit(1)
                        }

                        HStack {
                            Text("Total Return:")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Spacer()
                            Text(entry.data.portfolioTotalReturnPct)
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(entry.data.totalReturnIsPositive ? Color(red: 0.0, green: 0.79, blue: 0.65) : Color(red: 1.0, green: 0.23, blue: 0.19))
                                .lineLimit(1)
                        }
                    }
                }

            default:
                // ─── Medium 2x4 Investments Widget ───
                HStack(spacing: 16) {
                    // Left Column (Current Value & Invested)
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: 5) {
                            Circle().fill(Color(red: 0.04, green: 0.52, blue: 1.0)).frame(width: 8, height: 8)
                            Text("INVESTMENTS")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(Color(red: 0.04, green: 0.52, blue: 1.0))
                                .tracking(0.5)
                                .lineLimit(1)
                        }

                        Spacer()

                        VStack(alignment: .leading, spacing: 2) {
                            Text("CURRENT VALUE")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.secondary)
                                .tracking(0.3)
                                .lineLimit(1)
                            Text(entry.data.portfolioValue)
                                .font(.system(size: 24, weight: .heavy, design: .rounded))
                                .foregroundColor(.white)
                                .lineLimit(1)
                                .minimumScaleFactor(0.65)
                        }

                        Spacer()

                        HStack(spacing: 4) {
                            Text("Invested:")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Text(entry.data.portfolioInvested)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.white)
                                .lineLimit(1)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    // Vertical Divider
                    Rectangle()
                        .fill(Color.white.opacity(0.12))
                        .frame(width: 1)
                        .padding(.vertical, 2)

                    // Right Column (Returns & XIRR)
                    VStack(alignment: .leading, spacing: 0) {
                        HStack {
                            Text("RETURNS")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.secondary)
                                .tracking(0.4)
                                .lineLimit(1)
                            Spacer()
                            Text("XIRR \(entry.data.portfolioXirr)")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 7)
                                .padding(.vertical, 3)
                                .background(entry.data.xirrIsPositive ? Color(red: 0.04, green: 0.52, blue: 1.0) : Color(red: 1.0, green: 0.23, blue: 0.19))
                                .cornerRadius(5)
                                .lineLimit(1)
                        }

                        Spacer()

                        // 1D Return
                        VStack(alignment: .leading, spacing: 2) {
                            Text("1D Return")
                                .font(.system(size: 9, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            HStack(spacing: 3) {
                                Text(entry.data.portfolioDayChange)
                                    .font(.system(size: 13, weight: .bold, design: .rounded))
                                    .foregroundColor(entry.data.portfolioIsPositive ? Color(red: 0.0, green: 0.79, blue: 0.65) : Color(red: 1.0, green: 0.23, blue: 0.19))
                                    .lineLimit(1)
                                Text("(\(entry.data.portfolioDayAmount))")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                            }
                        }

                        Spacer()

                        // Total Return
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Total Return")
                                .font(.system(size: 9, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            HStack(spacing: 3) {
                                Text(entry.data.portfolioTotalReturn)
                                    .font(.system(size: 13, weight: .bold, design: .rounded))
                                    .foregroundColor(entry.data.totalReturnIsPositive ? Color(red: 0.0, green: 0.79, blue: 0.65) : Color(red: 1.0, green: 0.23, blue: 0.19))
                                    .lineLimit(1)
                                Text("(\(entry.data.portfolioTotalReturnPct))")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
        .applyWidgetBackground()
    }
}

// ═══════════════════════════════════════════════════════════════
// 2. MONEY MANAGER WIDGET (Dedicated Personal Cashflow)
// ═══════════════════════════════════════════════════════════════
struct MoneyManagerWidgetEntryView : View {
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                // ─── Small 2x2 Money Manager Widget ───
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 4) {
                        Circle().fill(Color(red: 0.0, green: 0.79, blue: 0.65)).frame(width: 7, height: 7)
                        Text("MONEY")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(Color(red: 0.0, green: 0.79, blue: 0.65))
                            .tracking(0.3)
                            .lineLimit(1)
                        Spacer()
                        Text("\(entry.data.monthlySavingsRate) save")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(entry.data.netSavingsIsPositive ? Color(red: 0.0, green: 0.79, blue: 0.65) : Color(red: 1.0, green: 0.23, blue: 0.19))
                            .cornerRadius(4)
                            .lineLimit(1)
                    }

                    Spacer()

                    VStack(alignment: .leading, spacing: 1) {
                        Text("TOTAL NET WORTH")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                        Text(entry.data.netWorth)
                            .font(.system(size: 19, weight: .heavy, design: .rounded))
                            .foregroundColor(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.65)
                    }

                    Spacer()

                    VStack(spacing: 3) {
                        HStack {
                            Text("Income:")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Spacer()
                            Text(entry.data.monthlyIncome)
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(.white)
                                .lineLimit(1)
                        }

                        HStack {
                            Text("Spend:")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Spacer()
                            Text(entry.data.monthlySpend)
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(.white)
                                .lineLimit(1)
                        }

                        HStack {
                            Text("Net Saved:")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Spacer()
                            Text(entry.data.monthlyNetSavings)
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(entry.data.netSavingsIsPositive ? Color(red: 0.0, green: 0.79, blue: 0.65) : Color(red: 1.0, green: 0.23, blue: 0.19))
                                .lineLimit(1)
                        }
                    }
                }

            default:
                // ─── Medium 2x4 Money Manager Widget ───
                HStack(spacing: 16) {
                    // Left Column (Net Worth & Inflow / Outflow)
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: 5) {
                            Circle().fill(Color(red: 0.0, green: 0.79, blue: 0.65)).frame(width: 8, height: 8)
                            Text("MONEY MANAGER")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(Color(red: 0.0, green: 0.79, blue: 0.65))
                                .tracking(0.5)
                                .lineLimit(1)
                        }

                        Spacer()

                        VStack(alignment: .leading, spacing: 2) {
                            Text("TOTAL NET WORTH")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.secondary)
                                .tracking(0.3)
                                .lineLimit(1)
                            Text(entry.data.netWorth)
                                .font(.system(size: 24, weight: .heavy, design: .rounded))
                                .foregroundColor(.white)
                                .lineLimit(1)
                                .minimumScaleFactor(0.65)
                        }

                        Spacer()

                        VStack(alignment: .leading, spacing: 1) {
                            HStack(spacing: 4) {
                                Text("Inflow:")
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                                Text(entry.data.monthlyIncome)
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundColor(.white)
                                    .lineLimit(1)
                            }
                            HStack(spacing: 4) {
                                Text("Outflow:")
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                                Text(entry.data.monthlySpend)
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundColor(.white)
                                    .lineLimit(1)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    // Vertical Divider
                    Rectangle()
                        .fill(Color.white.opacity(0.12))
                        .frame(width: 1)
                        .padding(.vertical, 2)

                    // Right Column (Savings & Cashflow Summary)
                    VStack(alignment: .leading, spacing: 0) {
                        HStack {
                            Text("CASHFLOW")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.secondary)
                                .tracking(0.4)
                                .lineLimit(1)
                            Spacer()
                            Text("\(entry.data.monthlySavingsRate) save")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 7)
                                .padding(.vertical, 3)
                                .background(entry.data.netSavingsIsPositive ? Color(red: 0.0, green: 0.79, blue: 0.65) : Color(red: 1.0, green: 0.23, blue: 0.19))
                                .cornerRadius(5)
                                .lineLimit(1)
                        }

                        Spacer()

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Net Saved This Month")
                                .font(.system(size: 9, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Text(entry.data.monthlyNetSavings)
                                .font(.system(size: 18, weight: .heavy, design: .rounded))
                                .foregroundColor(entry.data.netSavingsIsPositive ? Color(red: 0.0, green: 0.79, blue: 0.65) : Color(red: 1.0, green: 0.23, blue: 0.19))
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                        }

                        Spacer()

                        HStack(spacing: 4) {
                            Text("Month Spend:")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Text(entry.data.monthlySpend)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.white)
                                .lineLimit(1)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
        .applyWidgetBackground()
    }
}

// ═══════════════════════════════════════════════════════════════
// 3. DUAL OVERVIEW WIDGET (Side-by-Side Unified)
// ═══════════════════════════════════════════════════════════════
struct DualOverviewWidgetEntryView : View {
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                // ─── Small 2x2 Dual Widget ───
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 4) {
                        HStack(spacing: 3) {
                            Circle().fill(Color(red: 0.04, green: 0.52, blue: 1.0)).frame(width: 5, height: 5)
                            Circle().fill(Color(red: 0.0, green: 0.79, blue: 0.65)).frame(width: 5, height: 5)
                        }
                        Text("GAINBASE")
                            .font(.system(size: 9, weight: .heavy))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                        Spacer()
                        Text("XIRR \(entry.data.portfolioXirr)")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(entry.data.xirrIsPositive ? Color(red: 0.04, green: 0.52, blue: 1.0) : Color(red: 1.0, green: 0.23, blue: 0.19))
                            .lineLimit(1)
                    }

                    Spacer()

                    VStack(alignment: .leading, spacing: 1) {
                        Text("INVESTMENTS")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(Color(red: 0.04, green: 0.52, blue: 1.0))
                            .tracking(0.3)
                            .lineLimit(1)
                        HStack {
                            Text(entry.data.portfolioValue)
                                .font(.system(size: 15, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                            Spacer()
                            Text(entry.data.portfolioDayChange)
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(entry.data.portfolioIsPositive ? Color(red: 0.0, green: 0.79, blue: 0.65) : Color(red: 1.0, green: 0.23, blue: 0.19))
                                .lineLimit(1)
                        }
                    }

                    Rectangle()
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 1)
                        .padding(.vertical, 4)

                    VStack(alignment: .leading, spacing: 1) {
                        HStack {
                            Text("NET WORTH")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundColor(Color(red: 0.0, green: 0.79, blue: 0.65))
                                .tracking(0.3)
                                .lineLimit(1)
                            Spacer()
                            Text("\(entry.data.monthlySavingsRate) save")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundColor(entry.data.netSavingsIsPositive ? Color(red: 0.0, green: 0.79, blue: 0.65) : Color(red: 1.0, green: 0.23, blue: 0.19))
                                .lineLimit(1)
                        }
                        Text(entry.data.netWorth)
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                }

            default:
                // ─── Medium 2x4 Dual Widget ───
                HStack(spacing: 16) {
                    // Left: Investments
                    VStack(alignment: .leading, spacing: 0) {
                        HStack {
                            HStack(spacing: 4) {
                                Circle().fill(Color(red: 0.04, green: 0.52, blue: 1.0)).frame(width: 6, height: 6)
                                Text("INVESTMENTS")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(Color(red: 0.04, green: 0.52, blue: 1.0))
                                    .lineLimit(1)
                            }
                            Spacer()
                            Text("XIRR \(entry.data.portfolioXirr)")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(entry.data.xirrIsPositive ? Color(red: 0.04, green: 0.52, blue: 1.0) : Color(red: 1.0, green: 0.23, blue: 0.19))
                                .cornerRadius(4)
                                .lineLimit(1)
                        }

                        Spacer()

                        Text(entry.data.portfolioValue)
                            .font(.system(size: 22, weight: .heavy, design: .rounded))
                            .foregroundColor(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.65)

                        Spacer()

                        HStack(spacing: 4) {
                            Text("1D:")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Text(entry.data.portfolioDayChange)
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(entry.data.portfolioIsPositive ? Color(red: 0.0, green: 0.79, blue: 0.65) : Color(red: 1.0, green: 0.23, blue: 0.19))
                                .lineLimit(1)
                        }

                        HStack(spacing: 4) {
                            Text("Total:")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Text(entry.data.portfolioTotalReturn)
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(entry.data.totalReturnIsPositive ? Color(red: 0.0, green: 0.79, blue: 0.65) : Color(red: 1.0, green: 0.23, blue: 0.19))
                                .lineLimit(1)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    Rectangle()
                        .fill(Color.white.opacity(0.12))
                        .frame(width: 1)
                        .padding(.vertical, 2)

                    // Right: Money Manager
                    VStack(alignment: .leading, spacing: 0) {
                        HStack {
                            HStack(spacing: 4) {
                                Circle().fill(Color(red: 0.0, green: 0.79, blue: 0.65)).frame(width: 6, height: 6)
                                Text("MONEY")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(Color(red: 0.0, green: 0.79, blue: 0.65))
                                    .lineLimit(1)
                            }
                            Spacer()
                            Text("\(entry.data.monthlySavingsRate) save")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(entry.data.netSavingsIsPositive ? Color(red: 0.0, green: 0.79, blue: 0.65) : Color(red: 1.0, green: 0.23, blue: 0.19))
                                .cornerRadius(4)
                                .lineLimit(1)
                        }

                        Spacer()

                        Text(entry.data.netWorth)
                            .font(.system(size: 22, weight: .heavy, design: .rounded))
                            .foregroundColor(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.65)

                        Spacer()

                        HStack(spacing: 4) {
                            Text("Spend:")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Text(entry.data.monthlySpend)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.white)
                                .lineLimit(1)
                        }

                        HStack(spacing: 4) {
                            Text("Net Saved:")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Text(entry.data.monthlyNetSavings)
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(entry.data.netSavingsIsPositive ? Color(red: 0.0, green: 0.79, blue: 0.65) : Color(red: 1.0, green: 0.23, blue: 0.19))
                                .lineLimit(1)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
        .applyWidgetBackground()
    }
}

// ─── iOS 17+ & iOS 16 Container Background Compatibility Extension ───
extension View {
    func applyWidgetBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            return self.containerBackground(for: .widget) {
                Color(red: 0.08, green: 0.09, blue: 0.11)
            }
        } else {
            return self
                .padding(14)
                .background(Color(red: 0.08, green: 0.09, blue: 0.11))
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// WIDGET BUNDLE DEFINITIONS (3 Separate Widgets for Gallery)
// ═══════════════════════════════════════════════════════════════

struct GainbaseInvestmentsWidget: Widget {
    let kind: String = "GainbaseInvestmentsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            InvestmentsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Gainbase: Investments")
        .description("Track your Stock Portfolio: Current Value, Invested, 1D Returns, Total Returns & XIRR.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct GainbaseMoneyManagerWidget: Widget {
    let kind: String = "GainbaseMoneyManagerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            MoneyManagerWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Gainbase: Money Manager")
        .description("Track your Personal Finances: Net Worth, Income, Outflow & Savings Rate.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct GainbaseDualOverviewWidget: Widget {
    let kind: String = "GainbaseDualOverviewWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            DualOverviewWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Gainbase: Dual Overview")
        .description("Unified side-by-side overview of Stock Investments and Money Manager.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct GainbaseWidgetBundle: WidgetBundle {
    var body: some Widget {
        GainbaseInvestmentsWidget()
        GainbaseMoneyManagerWidget()
        GainbaseDualOverviewWidget()
    }
}
