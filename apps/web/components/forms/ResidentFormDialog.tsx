"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Copy,
  Check,
  RefreshCw,
  CheckCircle,
  KeyRound,
  Camera,
} from "lucide-react";

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

import ValidIdUpload from "./ValidIdUpload";
import { createResident } from "@/actions/residents";
import { uploadValidId } from "@/actions/valid-id";
import { uploadFacePhoto } from "@/actions/face-photos";
import { CameraCapture } from "@/components/camera-capture";

function generateTempPassword(length: number = 10): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const special = "!@#$%";

  const allChars = uppercase + lowercase + numbers + special;

  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

const contactNumberSchema = z
  .string()
  .min(1, "Contact number is required.")
  .regex(/^(\+639\d{9}|09\d{9})$/, "Use 09XXXXXXXXX or +639XXXXXXXXX.");

const schema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  address: z.string().min(1, "Address is required."),
  email: z.string().email("Enter a valid email address."),
  contactNumber: contactNumberSchema,
  password: z.string().min(6, "Password must be at least 6 characters."),
  dob: z.string().min(1, "Date of birth is required."),
  sex: z.enum(["male", "female"], { message: "Sex is required." }),
});

type FormValues = z.infer<typeof schema>;

interface ResidentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ResidentFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: ResidentFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [validIdFile, setValidIdFile] = useState<File | null>(null);
  const [validIdError, setValidIdError] = useState<string | null>(null);
  const [facePhotoFile, setFacePhotoFile] = useState<File | null>(null);
  const [facePhotoError, setFacePhotoError] = useState<string | null>(null);
  const [facePhotoPreview, setFacePhotoPreview] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "password" | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      address: "",
      email: "",
      contactNumber: "",
      password: generateTempPassword(),
      dob: "",
      sex: undefined as unknown as "male" | "female",
    },
  });

  function handleRegeneratePassword() {
    setValue("password", generateTempPassword());
  }

  async function handleCopy(text: string, field: "email" | "password") {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function resetForm() {
    reset({
      firstName: "",
      lastName: "",
      address: "",
      email: "",
      contactNumber: "",
      password: generateTempPassword(),
      dob: "",
      sex: undefined as unknown as "male" | "female",
    });
    setValidIdFile(null);
    setValidIdError(null);
    setFacePhotoFile(null);
    setFacePhotoError(null);
    setFacePhotoPreview(null);
    setFormError(null);
  }

  const handleFacePhotoCapture = (file: File) => {
    setFacePhotoFile(file);
    setFacePhotoError(null);
    const preview = URL.createObjectURL(file);
    setFacePhotoPreview(preview);
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setValidIdError(null);
    setFacePhotoError(null);

    if (!validIdFile) {
      setValidIdError("Valid ID document is required.");
      return;
    }

    if (!facePhotoFile) {
      setFacePhotoError("Resident face photo is required.");
      return;
    }

    startTransition(async () => {
      try {
        const validIdFormData = new FormData();
        validIdFormData.append("file", validIdFile);

        const validIdResult = await uploadValidId(validIdFormData);
        if (!validIdResult.success) {
          setFormError(validIdResult.error || "Failed to upload Valid ID");
          return;
        }

        const validIdUrl = (validIdResult.data as { url: string }).url;

        const facePhotoFormData = new FormData();
        facePhotoFormData.append("file", facePhotoFile);

        const facePhotoResult = await uploadFacePhoto(facePhotoFormData);
        if (!facePhotoResult.success) {
          setFormError(facePhotoResult.error || "Failed to upload face photo");
          return;
        }

        const facePhotoUrl = (facePhotoResult.data as { url: string }).url;

        const { error } = await createResident({
          email: values.email,
          password: values.password,
          name: `${values.firstName} ${values.lastName}`,
          address: values.address,
          phone_number: values.contactNumber,
          birthdate: values.dob,
          valid_id_url: validIdUrl,
          face_photo_url: facePhotoUrl,
          sex: values.sex,
        });

        if (error) {
          setFormError(error);
          toast.error(error);
          return;
        }

        setCreatedCredentials({
          email: values.email,
          password: values.password,
        });

        toast.success("Resident created successfully.");

        onOpenChange(false);
        setShowSuccessModal(true);
        onSuccess();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong.";
        setFormError(message);
        toast.error(message);
      }
    });
  });

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  }

  function handleSuccessClose() {
    setShowSuccessModal(false);
    setCreatedCredentials(null);
    resetForm();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">
              Add New Resident
            </DialogTitle>
            <DialogDescription>
              Create a new resident account with temporary credentials
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="font-medium">*</span> Required fields must be
            filled out correctly
          </div>

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

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  className="h-12 text-base"
                  placeholder="johndoe@example.com"
                  disabled={isPending}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

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
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Temporary Password <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    className="h-12 pr-10 font-mono text-base"
                    disabled={isPending}
                    {...register("password")}
                  />
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <button
                        type="button"
                        onClick={() => handleCopy(field.value, "password")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-gray-100"
                        title="Copy password"
                      >
                        {copiedField === "password" ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  onClick={handleRegeneratePassword}
                  title="Generate new password"
                  disabled={isPending}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This temporary password will be shared with the resident. They
                can change it later.
              </p>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

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

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Valid ID Document <span className="text-red-500">*</span>
              </Label>
              <ValidIdUpload
                value={validIdFile}
                onChange={setValidIdFile}
                disabled={isPending}
                error={validIdError ?? undefined}
              />
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium">
                Resident Face Photo <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Take a photo of the resident for in-office verification
              </p>

              {!facePhotoFile ? (
                <Button
                  type="button"
                  onClick={() => setShowCameraModal(true)}
                  disabled={isPending}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Resident Photo
                </Button>
              ) : (
                <div className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30">
                  <div className="flex items-start gap-4 p-4">
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img
                        src={facePhotoPreview || ""}
                        alt="Face Photo Preview"
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

              {facePhotoError && (
                <p className="text-sm text-red-600">{facePhotoError}</p>
              )}
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="h-12"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-12 bg-primary hover:bg-primary/90"
                disabled={isPending}
              >
                {isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Add Resident
              </Button>
            </DialogFooter>
          </form>

          <CameraCapture
            open={showCameraModal}
            onOpenChange={setShowCameraModal}
            onCapture={handleFacePhotoCapture}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-semibold">
              Resident Created Successfully!
            </DialogTitle>
            <DialogDescription>
              Share these credentials with the resident
            </DialogDescription>
          </DialogHeader>

          {createdCredentials && (
            <div className="space-y-4">
              <div className="space-y-4 rounded-lg bg-gray-50 p-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border bg-white px-3 py-2 text-sm font-mono">
                      {createdCredentials.email}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleCopy(createdCredentials.email, "email")
                      }
                    >
                      {copiedField === "email" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Temporary Password
                  </Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border bg-white px-3 py-2 text-sm font-mono">
                      {createdCredentials.password}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleCopy(createdCredentials.password, "password")
                      }
                    >
                      {copiedField === "password" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
                <div className="flex gap-2">
                  <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Important</p>
                    <p className="mt-1 text-xs">
                      The resident should change this password after their first
                      login for security purposes.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="h-12 w-full bg-primary hover:bg-primary/90"
                onClick={handleSuccessClose}
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}