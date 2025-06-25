import PublishReport from "@/app/main/PublishReportPage";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

export default function PublishReportPage() {
    return (
        <ProtectedRoute requireVKYC={true}>
            <PublishReport />
        </ProtectedRoute>
    );
}