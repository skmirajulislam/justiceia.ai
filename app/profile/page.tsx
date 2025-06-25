import Profile from "@/app/main/ProfilePage";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

export default function ProfilePage() {
    return (
        <ProtectedRoute requireVKYC={true}>
            <Profile />
        </ProtectedRoute>
    );
}