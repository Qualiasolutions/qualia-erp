"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Phone,
  Globe,
  MapPin,
  Edit,
  Trash2,
  MessageSquare,
  Calendar,
  Mail,
  PhoneCall,
  StickyNote,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getClientById,
  updateClientRecord,
  deleteClientRecord,
  logClientActivity,
  type LeadStatus,
} from "@/app/actions";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

type Client = {
  id: string;
  display_name: string;
  phone: string | null;
  website: string | null;
  billing_address: string | null;
  lead_status: LeadStatus;
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
  creator: { id: string; full_name: string | null; email: string | null } | null;
  assigned: { id: string; full_name: string | null; email: string | null } | null;
  contacts: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    position: string | null;
    is_primary: boolean;
  }>;
  activities: Array<{
    id: string;
    type: string;
    description: string;
    metadata: Record<string, any>;
    created_at: string;
    created_by: { id: string; full_name: string | null; email: string | null } | null;
  }>;
};

const statusColors: Record<LeadStatus, string> = {
  dropped: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  cold: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  hot: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  active_client: "bg-green-500/20 text-green-400 border-green-500/30",
  inactive_client: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const statusLabels: Record<LeadStatus, string> = {
  dropped: "Dropped Lead",
  cold: "Cold Lead",
  hot: "Hot Lead",
  active_client: "Active Client",
  inactive_client: "Inactive Client",
};

const activityIcons: Record<string, any> = {
  call: PhoneCall,
  email: Mail,
  meeting: Calendar,
  note: StickyNote,
  status_change: Edit,
};

export default function ClientDetailClient() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [activityType, setActivityType] = useState<"call" | "email" | "meeting" | "note">("note");
  const [activityDescription, setActivityDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadClient();
    }
  }, [params.id]);

  async function loadClient() {
    setIsLoading(true);
    const data = await getClientById(params.id as string);
    setClient(data as Client);
    setIsLoading(false);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set("id", params.id as string);

    const result = await updateClientRecord(formData);

    if (result.success) {
      setIsEditing(false);
      loadClient();
    }

    setIsSubmitting(false);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this client?")) return;

    const result = await deleteClientRecord(params.id as string);
    if (result.success) {
      router.push("/clients");
    }
  }

  async function handleAddActivity() {
    if (!activityDescription.trim()) return;

    setIsSubmitting(true);
    const result = await logClientActivity(
      params.id as string,
      activityType,
      activityDescription
    );

    if (result.success) {
      setIsAddingActivity(false);
      setActivityDescription("");
      loadClient();
    }

    setIsSubmitting(false);
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4" />
          <div className="h-4 bg-muted rounded w-1/4 mb-8" />
          <div className="space-y-4">
            <div className="h-32 bg-muted rounded" />
            <div className="h-48 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Client not found</h2>
        <p className="text-muted-foreground mb-4">
          The client you're looking for doesn't exist or has been deleted.
        </p>
        <Button asChild>
          <Link href="/clients">Back to Clients</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">
              {client.display_name}
            </h1>
            <Badge variant="outline" className={statusColors[client.lead_status]}>
              {statusLabels[client.lead_status]}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Added {formatDistanceToNow(new Date(client.created_at))} ago
            {client.creator && ` by ${client.creator.full_name || client.creator.email}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleDelete} className="text-red-500 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info Card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold mb-4">Contact Information</h2>
            <div className="space-y-3">
              {client.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${client.phone}`} className="hover:text-qualia-400">
                    {client.phone}
                  </a>
                </div>
              )}
              {client.website && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-qualia-400"
                  >
                    {client.website}
                  </a>
                </div>
              )}
              {client.billing_address && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{client.billing_address}</span>
                </div>
              )}
              {!client.phone && !client.website && !client.billing_address && (
                <p className="text-muted-foreground text-sm">No contact information available</p>
              )}
            </div>
          </div>

          {/* Notes Card */}
          {client.notes && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold mb-3">Notes</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {client.notes}
              </p>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Activity Timeline</h2>
              <Button size="sm" onClick={() => setIsAddingActivity(true)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Log Activity
              </Button>
            </div>

            {client.activities.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                No activity logged yet
              </p>
            ) : (
              <div className="space-y-4">
                {client.activities.map((activity) => {
                  const Icon = activityIcons[activity.type] || MessageSquare;
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatDistanceToNow(new Date(activity.created_at))} ago
                          </span>
                          {activity.created_by && (
                            <>
                              <span>by</span>
                              <span>
                                {activity.created_by.full_name || activity.created_by.email}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold mb-4">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span>{statusLabels[client.lead_status]}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Activities</span>
                <span>{client.activities.length}</span>
              </div>
              {client.last_contacted_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Contact</span>
                  <span>
                    {formatDistanceToNow(new Date(client.last_contacted_at))} ago
                  </span>
                </div>
              )}
              {client.assigned && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Assigned To</span>
                  <span>{client.assigned.full_name || client.assigned.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setActivityType("call");
                  setIsAddingActivity(true);
                }}
              >
                <PhoneCall className="w-4 h-4 mr-2" />
                Log Call
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setActivityType("email");
                  setIsAddingActivity(true);
                }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Log Email
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setActivityType("meeting");
                  setIsAddingActivity(true);
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Log Meeting
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_display_name">Client Name *</Label>
              <Input
                id="edit_display_name"
                name="display_name"
                defaultValue={client.display_name}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Phone</Label>
                <Input
                  id="edit_phone"
                  name="phone"
                  defaultValue={client.phone || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_website">Website</Label>
                <Input
                  id="edit_website"
                  name="website"
                  defaultValue={client.website || ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_billing_address">Address</Label>
              <Input
                id="edit_billing_address"
                name="billing_address"
                defaultValue={client.billing_address || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_lead_status">Status</Label>
              <Select name="lead_status" defaultValue={client.lead_status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold">Cold Lead</SelectItem>
                  <SelectItem value="hot">Hot Lead</SelectItem>
                  <SelectItem value="active_client">Active Client</SelectItem>
                  <SelectItem value="inactive_client">Inactive Client</SelectItem>
                  <SelectItem value="dropped">Dropped Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                name="notes"
                defaultValue={client.notes || ""}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-qualia-600 hover:bg-qualia-700"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Activity Type</Label>
              <Select
                value={activityType}
                onValueChange={(v) => setActivityType(v as typeof activityType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                placeholder="Describe the activity..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsAddingActivity(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddActivity}
                disabled={isSubmitting || !activityDescription.trim()}
                className="bg-qualia-600 hover:bg-qualia-700"
              >
                {isSubmitting ? "Logging..." : "Log Activity"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
