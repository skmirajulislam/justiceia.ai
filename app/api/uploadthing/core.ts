import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";

const f = createUploadthing();

async function getAuthUser(req: Request) {
    try {
        const cookieHeader = req.headers.get("cookie") || "";
        const cookies = Object.fromEntries(
            cookieHeader.split("; ").map((c) => {
                const [k, ...v] = c.split("=");
                return [k, decodeURIComponent(v.join("="))];
            })
        );
        const token = cookies["auth-token"];
        if (!token) return null;

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) return null;

        const decoded = jwt.verify(token, jwtSecret) as { userId: string };
        if (!decoded?.userId) return null;

        const profile = await prisma.profile.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                role: true,
                can_upload_reports: true,
                vkyc_completed: true,
            },
        });

        return profile;
    } catch {
        return null;
    }
}

export const ourFileRouter = {
    // VKYC Document & Selfie Uploader
    vkycDocumentUploader: f({
        image: { maxFileSize: "8MB", maxFileCount: 4 },
        pdf: { maxFileSize: "16MB", maxFileCount: 2 },
    })
        .middleware(async ({ req }) => {
            const user = await getAuthUser(req);
            if (!user) throw new UploadThingError("Unauthorized");
            return { userId: user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            return { uploadedBy: metadata.userId, url: file.url, key: file.key };
        }),

    // Case Report PDF Uploader (for Lawyers, Barristers, Government Officials)
    reportUploader: f({
        pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    })
        .middleware(async ({ req }) => {
            const user = await getAuthUser(req);
            if (!user) throw new UploadThingError("Unauthorized");

            const isProfessional = ["BARRISTER", "LAWYER", "GOVERNMENT_OFFICIAL"].includes(user.role);
            if (!isProfessional && !user.can_upload_reports) {
                throw new UploadThingError("Forbidden: Only legal professionals can publish reports");
            }

            return { userId: user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            return { uploadedBy: metadata.userId, url: file.url, key: file.key };
        }),

    // Avatar / Profile Picture Uploader
    avatarUploader: f({
        image: { maxFileSize: "4MB", maxFileCount: 1 },
    })
        .middleware(async ({ req }) => {
            const user = await getAuthUser(req);
            if (!user) throw new UploadThingError("Unauthorized");
            return { userId: user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            return { uploadedBy: metadata.userId, url: file.url, key: file.key };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
