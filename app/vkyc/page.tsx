import VKYC from "@/app/main/VKYCPage";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

export default function VKYCPage() {
    return (
        <ProtectedRoute>
            <VKYC />
        </ProtectedRoute>
    );
}