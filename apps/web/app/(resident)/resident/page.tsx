import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CardContent, Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, CircleCheckBig, FileText, } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type StatItem = {
    label: string;
    value: number;
    icon: LucideIcon;
};

type ActivityItem = {
    title: string;
    tag: string;
    content: string;
    icon: LucideIcon;

};


const stats: StatItem[] = [
    { label: "Total Appointments", value: 8, icon: Calendar },
    { label: "Pending", value: 5, icon: Clock },
    { label: "Approved", value: 2, icon: CircleCheckBig },
    { label: "Documents", value: 3, icon: FileText },

];


const announcement: ActivityItem[] = [

    { title: "Barangay", tag: "2 hours ago", content: "Your appointment has been approved for January 22, 2026", icon: CircleCheckBig },
    { title: "Cedula Request Pending", tag: "1 day ago", content: "Your request is being reviewed by the barangay office", icon: Clock },
    { title: "New Appointment Booked", tag: "1 day ago", content: "You booked an appointment for Barangay Clearance", icon: Calendar },

];


export default function ResidentOverviewPage() {
    return (
        <div className='space-y-6'>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (

                        <Card key={s.label} className="shadow-sm">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <Icon className="h-10 w-10 text-[#062E24]" />

                                </div>

                            </CardHeader>

                            <CardContent className='flex flex-col items-start space-y-1'>
                                <div className="text-3xl font-semibold">{s.value}</div>
                            </CardContent>


                            <CardContent className="flex flex-col items-start space-y-1">

                                <CardTitle className="font-normal text-[#062E24]">{s.label}</CardTitle>

                            </CardContent>
                        </Card>

                    );
                })}
            </div>


            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">Recent Activity</CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="space-y-3">
                    {announcement.map((a) => {
                        const Icon = a.icon;

                        return (
                            <div key={a.title} className="border-b py-5 px-2">
                                <div className="flex items-start gap-4">
                                    <Icon className="mt-1 h-8 w-8 shrink-0 text-[#062E24]" />

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="font-medium">{a.title}</div>
                                            <div className="shrink-0 text-xs text-muted-foreground">
                                                {a.tag}
                                            </div>
                                        </div>

                                        <div className="mt-1 text-sm text-muted-foreground">
                                            {a.content}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>

    );
}