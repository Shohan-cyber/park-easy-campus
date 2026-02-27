import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function ParkingSettings() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newSlot, setNewSlot] = useState({ slot_number: "", zone: "A", price_per_hour: "2.00" });

  if (role !== "admin") return <Navigate to="/dashboard" />;

  const { data: slots } = useQuery({
    queryKey: ["parking-slots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parking_slots").select("*").order("slot_number");
      if (error) throw error;
      return data;
    },
  });

  const addSlot = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("parking_slots").insert({
        slot_number: newSlot.slot_number,
        zone: newSlot.zone,
        price_per_hour: parseFloat(newSlot.price_per_hour),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parking-slots"] });
      toast({ title: "Slot added" });
      setAddOpen(false);
      setNewSlot({ slot_number: "", zone: "A", price_per_hour: "2.00" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updatePrice = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase.from("parking_slots").update({ price_per_hour: price }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parking-slots"] });
      toast({ title: "Price updated" });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground">Manage parking slots and pricing</p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Slot
          </Button>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slot</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Zone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price/Hr</th>
                </tr>
              </thead>
              <tbody>
                {slots?.map((slot) => (
                  <tr key={slot.id} className="border-b border-border/50">
                    <td className="px-4 py-3 font-mono font-bold">{slot.slot_number}</td>
                    <td className="px-4 py-3">{slot.zone}</td>
                    <td className="px-4 py-3 capitalize">{slot.status}</td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        step="0.50"
                        className="w-24"
                        defaultValue={slot.price_per_hour}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val !== Number(slot.price_per_hour)) {
                            updatePrice.mutate({ id: slot.id, price: val });
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Parking Slot</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Slot Number</Label>
              <Input value={newSlot.slot_number} onChange={(e) => setNewSlot({ ...newSlot, slot_number: e.target.value })} placeholder="D1" />
            </div>
            <div className="space-y-2">
              <Label>Zone</Label>
              <Input value={newSlot.zone} onChange={(e) => setNewSlot({ ...newSlot, zone: e.target.value })} placeholder="D" />
            </div>
            <div className="space-y-2">
              <Label>Price per Hour ($)</Label>
              <Input type="number" step="0.50" value={newSlot.price_per_hour} onChange={(e) => setNewSlot({ ...newSlot, price_per_hour: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addSlot.mutate()} disabled={!newSlot.slot_number}>Add Slot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
