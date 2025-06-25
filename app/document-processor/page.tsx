import DocumentProcessor from "@/app/main/DocumentProcessorPage";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

export default function DocumentProcessorPage() {
    return (
        <ProtectedRoute requireVKYC={true}>
            <DocumentProcessor />
        </ProtectedRoute>
    );
}