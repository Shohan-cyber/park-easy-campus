import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Car, CheckCircle, Clock, DollarSign, ParkingSquare } from "lucide-react";

export default function Dashboard() {
  const { user, role } = useAuth();

  const { data: slots } = useQuery({
    queryKey: ["parking-slots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parking_slots").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["bookings-summary"],
    queryFn: async () => {
      const query = supabase.from("bookings").select("*");
      if (role === "user") query.eq("user_id", user!.id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const available = slots?.filter((s) => s.status === "available").length ?? 0;
  const booked = slots?.filter((s) => s.status === "booked").length ?? 0;
  const occupied = slots?.filter((s) => s.status === "occupied").length ?? 0;
  const totalSlots = slots?.length ?? 0;

  const activeBookings = bookings?.filter((b) => b.status === "booked" || b.status === "checked_in").length ?? 0;
  const completedBookings = bookings?.filter((b) => b.status === "completed").length ?? 0;
  const totalRevenue = bookings?.filter(b => b.status === "completed").reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) ?? 0;

  const stats = [
    { label: "Available Slots", value: available, total: totalSlots, icon: ParkingSquare, color: "text-slot-available" },
    { label: "Booked", value: booked, icon: Clock, color: "text-slot-booked" },
    { label: "Occupied", value: occupied, icon: Car, color: "text-slot-occupied" },
    { label: "Active Bookings", value: activeBookings, icon: CheckCircle, color: "text-primary" },
    ...(role === "admin" ? [{ label: "Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-primary" }] : []),
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            {role === "admin" ? "Overview of campus parking operations" : role === "parking_staff" ? "Manage parking check-ins and check-outs" : "Welcome to campus parking"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold font-mono">{stat.value}</p>
              {"total" in stat && <p className="text-xs text-muted-foreground mt-1">of {stat.total} total</p>}
            </div>
          ))}
        </div>

        {/* Slot overview mini grid */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Parking Grid Overview</h3>
          <div className="flex gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slot-available" /> Available</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slot-booked" /> Booked</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slot-occupied" /> Occupied</div>
          </div>
          <div className="grid grid-cols-8 gap-2">
            {slots?.map((slot) => (
              <div
                key={slot.id}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-all ${
                  slot.status === "available"
                    ? "bg-slot-available/15 text-slot-available border border-slot-available/30"
                    : slot.status === "booked"
                    ? "bg-slot-booked/15 text-slot-booked border border-slot-booked/30"
                    : "bg-slot-occupied/15 text-slot-occupied border border-slot-occupied/30"
                }`}
              >
                {slot.slot_number}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
