import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ valid: false });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return NextResponse.json({ valid: false });
        }

        const decoded = jwt.verify(token, jwtSecret);
        return NextResponse.json({ valid: true, decoded });

    } catch (error) {
        return NextResponse.json({ valid: false });
    }
}