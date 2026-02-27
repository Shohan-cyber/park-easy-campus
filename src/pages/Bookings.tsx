import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle, Clock, XCircle, LogIn, LogOut } from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  booked: { label: "Booked", variant: "default" },
  checked_in: { label: "Checked In", variant: "secondary" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default function Bookings() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const query = supabase
        .from("bookings")
        .select("*, parking_slots(slot_number, zone, price_per_hour)")
        .order("created_at", { ascending: false });
      if (role === "user") query.eq("user_id", user!.id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const cancelBooking = useMutation({
    mutationFn: async (booking: any) => {
      const { error: bErr } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
      if (bErr) throw bErr;
      const { error: sErr } = await supabase.from("parking_slots").update({ status: "available" }).eq("id", booking.slot_id);
      if (sErr) throw sErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["parking-slots"] });
      queryClient.invalidateQueries({ queryKey: ["active-booking"] });
      toast({ title: "Booking cancelled" });
    },
  });

  const checkIn = useMutation({
    mutationFn: async (booking: any) => {
      const { error: bErr } = await supabase.from("bookings").update({ status: "checked_in", checked_in_at: new Date().toISOString() }).eq("id", booking.id);
      if (bErr) throw bErr;
      const { error: sErr } = await supabase.from("parking_slots").update({ status: "occupied" }).eq("id", booking.slot_id);
      if (sErr) throw sErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["parking-slots"] });
      toast({ title: "Checked in successfully" });
    },
  });

  const checkOut = useMutation({
    mutationFn: async (booking: any) => {
      const checkedInAt = new Date(booking.checked_in_at);
      const now = new Date();
      const hours = Math.max(1, Math.ceil((now.getTime() - checkedInAt.getTime()) / (1000 * 60 * 60)));
      const rate = Number(booking.parking_slots?.price_per_hour ?? 2);
      const total = hours * rate;

      const { error: bErr } = await supabase.from("bookings").update({
        status: "completed",
        checked_out_at: now.toISOString(),
        total_amount: total,
      }).eq("id", booking.id);
      if (bErr) throw bErr;
      const { error: sErr } = await supabase.from("parking_slots").update({ status: "available" }).eq("id", booking.slot_id);
      if (sErr) throw sErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["parking-slots"] });
      queryClient.invalidateQueries({ queryKey: ["active-booking"] });
      toast({ title: "Checked out. Billing calculated." });
    },
  });

  const isStaffOrAdmin = role === "parking_staff" || role === "admin";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bookings</h2>
          <p className="text-muted-foreground">
            {role === "user" ? "Your parking bookings" : "Manage all parking bookings"}
          </p>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slot</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Zone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Booked At</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings?.map((booking) => {
                  const cfg = statusConfig[booking.status] ?? statusConfig.booked;
                  return (
                    <tr key={booking.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold">{booking.parking_slots?.slot_number}</td>
                      <td className="px-4 py-3">{booking.parking_slots?.zone}</td>
                      <td className="px-4 py-3">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{format(new Date(booking.booked_at), "MMM d, HH:mm")}</td>
                      <td className="px-4 py-3 font-mono">{booking.total_amount ? `$${Number(booking.total_amount).toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {booking.status === "booked" && role === "user" && (
                          <Button size="sm" variant="destructive" onClick={() => cancelBooking.mutate(booking)}>
                            <XCircle className="w-3 h-3 mr-1" /> Cancel
                          </Button>
                        )}
                        {booking.status === "booked" && isStaffOrAdmin && (
                          <Button size="sm" onClick={() => checkIn.mutate(booking)}>
                            <LogIn className="w-3 h-3 mr-1" /> Check In
                          </Button>
                        )}
                        {booking.status === "checked_in" && isStaffOrAdmin && (
                          <Button size="sm" variant="secondary" onClick={() => checkOut.mutate(booking)}>
                            <LogOut className="w-3 h-3 mr-1" /> Check Out
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(!bookings || bookings.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No bookings found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
