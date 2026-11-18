import ReportCategoryBreakdown from './ReportCategoryBreakdown';

// Income by category: the same Bento breakdown as spending, for income rows.
export default function ReportIncomeBreakdown(props) {
  return <ReportCategoryBreakdown {...props} type="income" />;
}
