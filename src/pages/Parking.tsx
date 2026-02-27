import { useState } from "react";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Car, ParkingSquare } from "lucide-react";

export default function Parking() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: slots, isLoading } = useQuery({
    queryKey: ["parking-slots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parking_slots").select("*").order("slot_number");
      if (error) throw error;
      return data;
    },
  });

  // Check if user already has an active booking
  const { data: activeBooking } = useQuery({
    queryKey: ["active-booking", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user!.id)
        .in("status", ["booked", "checked_in"])
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && role === "user",
  });

  const bookSlot = useMutation({
    mutationFn: async (slotId: string) => {
      // Create booking
      const { error: bookError } = await supabase.from("bookings").insert({
        user_id: user!.id,
        slot_id: slotId,
        status: "booked",
      });
      if (bookError) throw bookError;
      // Update slot status
      const { error: slotError } = await supabase
        .from("parking_slots")
        .update({ status: "booked" })
        .eq("id", slotId);
      if (slotError) throw slotError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parking-slots"] });
      queryClient.invalidateQueries({ queryKey: ["active-booking"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast({ title: "Slot booked!", description: `Slot ${selectedSlot?.slot_number} has been reserved.` });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSlotClick = (slot: any) => {
    if (role === "user" && slot.status === "available" && !activeBooking) {
      setSelectedSlot(slot);
      setDialogOpen(true);
    }
  };

  const zones = ["A", "B", "C"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Parking Slots</h2>
          <p className="text-muted-foreground">
            {role === "user" ? "Select an available slot to book" : "View and manage parking slots"}
          </p>
        </div>

        {activeBooking && role === "user" && (
          <div className="glass-card p-4 border-l-4 border-l-slot-booked">
            <p className="text-sm font-medium">You have an active booking. Cancel or complete it before booking another slot.</p>
          </div>
        )}

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slot-available" /> Available</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slot-booked" /> Booked</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slot-occupied" /> Occupied</div>
        </div>

        {zones.map((zone) => {
          const zoneSlots = slots?.filter((s) => s.zone === zone) ?? [];
          return (
            <div key={zone} className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-1">Zone {zone}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {zoneSlots.filter(s => s.status === "available").length} available · ${zoneSlots[0]?.price_per_hour}/hr
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                {zoneSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => handleSlotClick(slot)}
                    disabled={slot.status !== "available" || role !== "user" || !!activeBooking}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-mono font-bold transition-all border-2 ${
                      slot.status === "available"
                        ? "bg-slot-available/10 text-slot-available border-slot-available/30 hover:bg-slot-available/20 hover:scale-105 cursor-pointer"
                        : slot.status === "booked"
                        ? "bg-slot-booked/10 text-slot-booked border-slot-booked/30 cursor-default"
                        : "bg-slot-occupied/10 text-slot-occupied border-slot-occupied/30 cursor-default"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Car className="w-4 h-4" />
                    {slot.slot_number}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Booking</DialogTitle>
            <DialogDescription>
              Book slot <strong>{selectedSlot?.slot_number}</strong> in Zone {selectedSlot?.zone} at <strong>${selectedSlot?.price_per_hour}/hr</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
            <ParkingSquare className="w-10 h-10 text-primary" />
            <div>
              <p className="font-bold text-lg">{selectedSlot?.slot_number}</p>
              <p className="text-sm text-muted-foreground">Zone {selectedSlot?.zone} · Minimum 1 hour charge</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => bookSlot.mutate(selectedSlot.id)} disabled={bookSlot.isPending}>
              {bookSlot.isPending ? "Booking..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
