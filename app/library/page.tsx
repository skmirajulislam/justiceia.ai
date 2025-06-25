import LegalLibrary from "@/app/main/LegalLibraryPage";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

export default function LibraryPage() {
    return (
        <ProtectedRoute requireVKYC={true}>
            <LegalLibrary />
        </ProtectedRoute>
    );
}