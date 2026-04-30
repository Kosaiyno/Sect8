import { NextResponse } from 'next/server';
import { uploadToStorage } from '@/app/actions/og';
export async function POST(req) {
    try {
        const body = await req.json();
        const memory = body.memory;
        if (!memory)
            return NextResponse.json({ success: false, error: 'memory required' }, { status: 400 });
        const res = await uploadToStorage(JSON.stringify(memory));
        if (!res.success)
            return NextResponse.json({ success: false, error: res.error }, { status: 500 });
        return NextResponse.json({ success: true, hash: res.hash });
    }
    catch (e) {
        return NextResponse.json({ success: false, error: String((e === null || e === void 0 ? void 0 : e.message) || e) }, { status: 500 });
    }
}
