import AIChatbot from "@/app/main/ChatbotPage";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

export default function ChatbotPage() {
    return (
        <ProtectedRoute requireVKYC={true}>
            <AIChatbot />
        </ProtectedRoute>
    );
}