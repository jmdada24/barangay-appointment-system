"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Camera, Eye } from "lucide-react";

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

import { CameraCapture } from "@/components/camera-capture";
import ValidIdUpload from "./ValidIdUpload";
import { updateResident } from "@/actions/residents";
import { updateResidentFacePhoto } from "@/actions/residents";
import { uploadFacePhoto } from "@/actions/face-photos";
import { uploadValidId } from "@/actions/valid-id";

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

interface ResidentEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resident: {
    id: number;
    name: string;
    address: string;
    phone_number: string;
    birthdate: string;
    sex: "male" | "female";
    face_photo_url?: string;
    valid_id_url?: string;
  } | null;
  onSuccess: () => void;
}

export default function ResidentEditForm({
  open,
  onOpenChange,
  resident,
  onSuccess,
}: ResidentEditFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [validIdFile, setValidIdFile] = useState<File | null>(null);
  const [validIdError, setValidIdError] = useState<string | null>(null);
  const [facePhotoFile, setFacePhotoFile] = useState<File | null>(null);
  const [facePhotoPreview, setFacePhotoPreview] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showIdPreview, setShowIdPreview] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      address: "",
      contactNumber: "",
      dob: "",
      sex: undefined as unknown as "male" | "female",
    },
  });

  useEffect(() => {
    if (resident) {
      reset({
        firstName: resident.name.split(" ")[0] || "",
        lastName: resident.name.split(" ").slice(1).join(" ") || "",
        address: resident.address || "",
        contactNumber: resident.phone_number || "",
        dob: resident.birthdate || "",
        sex: resident.sex,
      });
    }
  }, [resident, reset]);

  const handleFacePhotoCapture = (file: File) => {
    setFacePhotoFile(file);
    const preview = URL.createObjectURL(file);
    setFacePhotoPreview(preview);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!resident) return;

    setFormError(null);
    setValidIdError(null);

    startTransition(async () => {
      try {
        const { error: updateError } = await updateResident(resident.id, {
          name: `${values.firstName} ${values.lastName}`,
          address: values.address,
          phone_number: values.contactNumber,
          birthdate: values.dob,
          sex: values.sex,
        });

        if (updateError) {
          setFormError(updateError);
          toast.error(updateError);
          return;
        }

        if (validIdFile) {
          const validIdFormData = new FormData();
          validIdFormData.append("file", validIdFile);

          const uploadResult = await uploadValidId(validIdFormData);
          if (!uploadResult.success) {
            const message = uploadResult.error || "Failed to upload Valid ID";
            setValidIdError(message);
            toast.error(message);
            return;
          }

          const validIdUrl = (uploadResult.data as { url: string }).url;

          const { error: idError } = await updateResident(resident.id, {
            valid_id_url: validIdUrl,
          });

          if (idError) {
            setFormError(idError);
            toast.error(idError);
            return;
          }
        }

        if (facePhotoFile) {
          const faceFormData = new FormData();
          faceFormData.append("file", facePhotoFile);

          const uploadResult = await uploadFacePhoto(faceFormData);
          if (!uploadResult.success) {
            const message = uploadResult.error || "Failed to upload face photo";
            setFormError(message);
            toast.error(message);
            return;
          }

          const facePhotoPath = (uploadResult.data as { path: string }).path;
          const updatePhotoResult = await updateResidentFacePhoto(
            resident.id,
            facePhotoPath,
            true
          );

          if (!updatePhotoResult.success) {
            const message =
              updatePhotoResult.error || "Failed to update face photo";
            setFormError(message);
            toast.error(message);
            return;
          }
        }

        toast.success("Resident updated successfully.");

        setValidIdFile(null);
        setValidIdError(null);
        setFacePhotoFile(null);
        setFacePhotoPreview(null);
        onOpenChange(false);
        onSuccess();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong.";
        setFormError(message);
        toast.error(message);
      }
    });
  });

  if (!resident) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">
              Edit Resident
            </DialogTitle>
            <DialogDescription>
              Update resident information and documents
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-6">
            {formError && (
              <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  className="h-12 text-base"
                  disabled={isPending}
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  className="h-12 text-base"
                  disabled={isPending}
                  {...register("lastName")}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Address <span className="text-red-500">*</span>
              </Label>
              <Input
                className="h-12 text-base"
                disabled={isPending}
                {...register("address")}
              />
              {errors.address && (
                <p className="text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Contact Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  className="h-12 text-base"
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

            <div className="space-y-4 border-t pt-6">
              <Label className="text-sm font-medium">
                Valid ID Document
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload or replace the resident's valid ID (optional)
              </p>

              {resident.valid_id_url && !validIdFile && (
                <div className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img
                        src={resident.valid_id_url}
                        alt="Current Valid ID"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Current Valid ID
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Click below to view full size or upload a new one
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowIdPreview(true)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Full Size
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setValidIdFile(null)}
                        >
                          Replace
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!resident.valid_id_url && !validIdFile && (
                <div className="space-y-2">
                  <ValidIdUpload
                    value={validIdFile}
                    onChange={setValidIdFile}
                    disabled={isPending}
                    error={validIdError ?? undefined}
                  />
                </div>
              )}

              {validIdFile && (
                <div className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img
                        src={URL.createObjectURL(validIdFile)}
                        alt="New Valid ID"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {validIdFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(validIdFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setValidIdFile(null)}
                      >
                        Cancel Upload
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {validIdError && (
                <p className="text-sm text-red-600">{validIdError}</p>
              )}
            </div>

            <div className="space-y-4 border-t pt-6">
              <Label className="text-sm font-medium">
                Resident Face Photo
              </Label>
              <p className="text-xs text-muted-foreground">
                Update resident face photo for verification (optional)
              </p>

              {resident.face_photo_url && !facePhotoFile && (
                <div className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img
                        src={resident.face_photo_url}
                        alt="Current Face Photo"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Current Photo
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Click "Retake Photo" to capture a new one
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setShowCameraModal(true)}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Retake Photo
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {!resident.face_photo_url && !facePhotoFile && (
                <Button
                  type="button"
                  onClick={() => setShowCameraModal(true)}
                  disabled={isPending}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Take Face Photo
                </Button>
              )}

              {facePhotoFile && (
                <div className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img
                        src={facePhotoPreview || ""}
                        alt="New Face Photo"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {facePhotoFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(facePhotoFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          setFacePhotoFile(null);
                          setFacePhotoPreview(null);
                        }}
                      >
                        Retake Photo
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 border-t pt-4">
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
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CameraCapture
        open={showCameraModal}
        onOpenChange={setShowCameraModal}
        onCapture={handleFacePhotoCapture}
      />

      <Dialog open={showIdPreview} onOpenChange={setShowIdPreview}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Valid ID</DialogTitle>
          </DialogHeader>
          {resident.valid_id_url && (
            <img
              src={resident.valid_id_url}
              alt="Valid ID"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}