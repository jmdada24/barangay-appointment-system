"use client";

import { useEffect, useTransition, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Eye, X, ZoomIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { updateResident } from "@/actions/residents";
import type { ResidentWithUser } from "@/types/resident";

const contactNumberSchema = z
  .string()
  .min(1, "Contact number is required.")
  .regex(/^(\+639\d{9}|09\d{9})$/, "Use 09XXXXXXXXX or +639XXXXXXXXX.");

const schema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  address: z.string().min(1, "Address is required."),
  contactNumber: contactNumberSchema,
  dob: z.string().min(1, "Date of birth is required."),
  sex: z.enum(["male", "female"], { message: "Sex is required." }),
});

type FormValues = z.infer<typeof schema>;

interface ResidentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resident: ResidentWithUser | null;
  onSuccess: () => void;
}

export default function ResidentEditDialog({
  open,
  onOpenChange,
  resident,
  onSuccess,
}: ResidentEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [showValidIdModal, setShowValidIdModal] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Populate form when resident changes
  useEffect(() => {
    if (resident) {
      const nameParts = resident.name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      reset({
        firstName,
        lastName,
        address: resident.address || "",
        contactNumber: resident.phone_number || "",
        dob: resident.birthdate || "",
        sex: (resident.sex as "male" | "female") || undefined,
      });
    }
  }, [resident, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!resident) return;
    setFormError(null);

    startTransition(async () => {
      const { error } = await updateResident(resident.id, {
        name: `${values.firstName} ${values.lastName}`,
        address: values.address,
        phone_number: values.contactNumber,
        birthdate: values.dob,
        sex: values.sex,
      });

      if (error) {
        setFormError(error);
        return;
      }

      onOpenChange(false);
      onSuccess();
    });
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">
              Edit Resident
            </DialogTitle>
            <DialogDescription>Update resident information</DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-6">
            {formError && (
              <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            {/* Email (disabled) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email</Label>
              <Input
                className="h-12 text-base bg-gray-50"
                value={resident?.users?.email || ""}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            {/* First + Last Name */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  className="h-12 text-base"
                  placeholder="John"
                  disabled={isPending}
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  className="h-12 text-base"
                  placeholder="Doe"
                  disabled={isPending}
                  {...register("lastName")}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Address <span className="text-red-500">*</span>
              </Label>
              <Input
                className="h-12 text-base"
                placeholder="Purok 1, Barangay Bayabas, Matina, Davao City"
                disabled={isPending}
                {...register("address")}
              />
              {errors.address && (
                <p className="text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            {/* Contact Number */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Contact Number <span className="text-red-500">*</span>
              </Label>
              <Input
                className="h-12 text-base"
                placeholder="09123456789"
                disabled={isPending}
                {...register("contactNumber")}
              />
              <p className="text-xs text-muted-foreground">
                Format: 09XXXXXXXXX or +639XXXXXXXXX
              </p>
              {errors.contactNumber && (
                <p className="text-sm text-red-600">
                  {errors.contactNumber.message}
                </p>
              )}
            </div>

            {/* DOB + Sex */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  className="h-12 text-base"
                  disabled={isPending}
                  {...register("dob")}
                />
                {errors.dob && (
                  <p className="text-sm text-red-600">{errors.dob.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Sex <span className="text-red-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="sex"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-full h-12 min-h-12 text-base">
                        <SelectValue placeholder="Please Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.sex && (
                  <p className="text-sm text-red-600">{errors.sex.message}</p>
                )}
              </div>
            </div>

            {/* Valid ID Section (Read-only) */}
            {resident?.valid_id_url && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Valid ID Document</p>
                <div className="relative w-full h-40 rounded-lg border border-border overflow-hidden bg-muted/30 cursor-pointer group"
                  onClick={() => setShowValidIdModal(true)}>
                  <img
                    src={resident.valid_id_url}
                    alt="Valid ID"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className="flex flex-col items-center text-white">
                      <ZoomIn className="w-6 h-6" />
                      <span className="text-sm mt-2">Click to enlarge</span>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setShowValidIdModal(true)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Full Size
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Valid ID cannot be changed. Contact support if you need to update this document.
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="h-12"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-12 bg-primary hover:bg-primary/90"
                disabled={isPending}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Valid ID Full Preview Modal */}
      {showValidIdModal && resident?.valid_id_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowValidIdModal(false)}
        >
          <button
            onClick={() => setShowValidIdModal(false)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div
            className="relative max-w-[90vw] max-h-[90vh] rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={resident.valid_id_url}
              alt="Valid ID Full Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <p className="text-white text-sm font-medium">
                {resident.name} - Valid ID
              </p>
              <p className="text-white/70 text-xs mt-1">
                Click outside or press ESC to close
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}