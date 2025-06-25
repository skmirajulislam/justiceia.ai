import VideoConsult from "@/app/main/VideoConsultPage";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

export default function ConsultPage() {
    return (
        <ProtectedRoute requireVKYC={true}>
            <VideoConsult />
        </ProtectedRoute>
    );
}