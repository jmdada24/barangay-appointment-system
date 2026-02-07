"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, ImageIcon, ZoomIn, Eye, EyeOff } from "lucide-react";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { registerResident, uploadValidId } from "@/actions/auth";

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

import AuthLeftPanel from "./auth-sidepanel";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const contactNumberSchema = z
  .string()
  .min(1, "Contact number is required.")
  .regex(/^(\+639\d{9}|09\d{9})$/, "Use 09XXXXXXXXX or +639XXXXXXXXX.");

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required."),
    lastName: z.string().min(1, "Last name is required."),
    address: z.string().min(1, "Address is required."),
    email: z.string().email("Enter a valid email address."),
    contactNumber: contactNumberSchema,
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string().min(1, "Please confirm your password."),
    dob: z.string().min(1, "Date of birth is required."),
    sex: z.enum(["male", "female"], { message: "Sex is required." }),
    validID: z
      .instanceof(File, { message: "Valid ID is required." })
      .refine((file) => file.size <= MAX_FILE_SIZE, "Max file size is 5MB.")
      .refine(
        (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
        "Only .jpg, .jpeg, .png, and .webp formats are supported."
      ),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResidentRegister() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      address: "",
      email: "",
      contactNumber: "",
      password: "",
      confirm: "",
      dob: "",
      sex: undefined as unknown as "male" | "female",
      validID: undefined as unknown as File,
    },
  });

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPreviewModal(false);
      }
    };

    if (showPreviewModal) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [showPreviewModal]);

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setFormError("Only .jpg, .jpeg, .png, and .webp formats are supported.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setFormError("Max file size is 5MB.");
        return;
      }

      setValue("validID", file, { shouldValidate: true });
      clearErrors("validID");
      setFormError(null);
      setFileName(file.name);

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    },
    [setValue, clearErrors]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleRemoveFile = useCallback(() => {
    setValue("validID", undefined as unknown as File, { shouldValidate: false });
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [setValue, previewUrl]);

  const handleZoneClick = useCallback(() => {
    if (!loading) {
      fileInputRef.current?.click();
    }
  }, [loading]);

  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPreviewModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowPreviewModal(false);
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // 1. Upload Valid ID to Supabase Storage
      let validIdPath: string | undefined;

      if (values.validID) {
        const formData = new FormData();
        formData.append("file", values.validID);

        const uploadResult = await uploadValidId(formData);

        if (!uploadResult.success) {
          setFormError(uploadResult.error || "Failed to upload Valid ID.");
          setLoading(false);
          return;
        }

        validIdPath = uploadResult.data?.path as string;
      }

      // 2. Register the resident (creates auth user and sends OTP)
      const result = await registerResident({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        address: values.address,
        contactNumber: values.contactNumber,
        sex: values.sex,
        dob: values.dob,
        validIdPath,
      });

      if (!result.success) {
        setFormError(result.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // 3. Success - redirect to OTP verification
      setSuccess("Registration successful! Please check your email for the verification code.");

      setTimeout(() => {
        router.push(`/verify-otp?email=${encodeURIComponent(values.email)}`);
      }, 1500);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  });

  return (
    <>
      <div className="h-dvh overflow-hidden lg:grid lg:grid-cols-2">
        {/* LEFT PANEL */}
        <AuthLeftPanel />

        {/* RIGHT PANEL */}
        <div className="h-dvh overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-6 lg:p-12">
            <div className="w-full max-w-2xl">
              <h2 className="text-4xl font-semibold tracking-tight">Create Resident Account</h2>
              <p className="mt-2 text-base text-muted-foreground">Register to access barangay services</p>

              <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span className="font-medium">*</span> Required fields must be filled out correctly
              </div>

              <form onSubmit={onSubmit} className="mt-8 space-y-6">
                {/* First + Last */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      className="h-12 text-base"
                      placeholder="John"
                      disabled={loading}
                      {...register("firstName")}
                    />
                    {errors.firstName && <p className="text-sm text-red-600">{errors.firstName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      className="h-12 text-base"
                      placeholder="Doe"
                      disabled={loading}
                      {...register("lastName")}
                    />
                    {errors.lastName && <p className="text-sm text-red-600">{errors.lastName.message}</p>}
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="h-12 text-base"
                    placeholder="Matina, Davao City"
                    disabled={loading}
                    {...register("address")}
                  />
                  {errors.address && <p className="text-sm text-red-600">{errors.address.message}</p>}
                </div>

                {/* Email + Contact */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      className="h-12 text-base"
                      placeholder="johndoe@example.com"
                      disabled={loading}
                      {...register("email")}
                    />
                    {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Contact Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      className="h-12 text-base"
                      placeholder="09123456789"
                      disabled={loading}
                      {...register("contactNumber")}
                    />
                    <p className="text-xs text-muted-foreground">Format: 09XXXXXXXXX or +639XXXXXXXXX</p>
                    {errors.contactNumber && (
                      <p className="text-sm text-red-600">{errors.contactNumber.message}</p>
                    )}
                  </div>
                </div>

                {/* Password + Confirm with Eye Icons */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        className="h-12 text-base pr-10"
                        placeholder="********"
                        disabled={loading}
                        {...register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Confirm Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        className="h-12 text-base pr-10"
                        placeholder="********"
                        disabled={loading}
                        {...register("confirm")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={loading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {errors.confirm && <p className="text-sm text-red-600">{errors.confirm.message}</p>}
                  </div>
                </div>

                {/* DOB + Sex */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Date of Birth <span className="text-red-500">*</span>
                    </Label>
                    <Input type="date" className="h-12 text-base" disabled={loading} {...register("dob")} />
                    {errors.dob && <p className="text-sm text-red-600">{errors.dob.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Sex <span className="text-red-500">*</span>
                    </Label>

                    <Controller
                      control={control}
                      name="sex"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={loading}>
                          <SelectTrigger className="w-full! h-12! text-base">
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
                    {errors.sex && <p className="text-sm text-red-600">{errors.sex.message}</p>}
                  </div>
                </div>

                {/* Valid ID - Drag & Drop + Click to Upload */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Valid ID <span className="text-red-500">*</span>
                  </Label>

                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    disabled={loading}
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                  />

                  {!previewUrl ? (
                    <div
                      onClick={handleZoneClick}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`
                        relative flex flex-col items-center justify-center
                        w-full min-h-45 p-6
                        border-2 border-dashed rounded-lg
                        cursor-pointer transition-all duration-200
                        ${isDragging
                          ? "border-primary bg-primary/5 scale-[1.02]"
                          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                        }
                        ${loading ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                    >
                      <div className="flex flex-col items-center">
                        <div className={`
                          w-14 h-14 rounded-full flex items-center justify-center mb-4
                          ${isDragging ? "bg-primary/10" : "bg-muted"}
                        `}>
                          <Upload className={`w-7 h-7 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {isDragging ? "Drop your file here" : "Drag & drop your Valid ID here"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          or <span className="text-primary font-medium">click to browse</span>
                        </p>
                        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                          <span className="px-2 py-1 rounded bg-muted">JPG</span>
                          <span className="px-2 py-1 rounded bg-muted">PNG</span>
                          <span className="px-2 py-1 rounded bg-muted">WebP</span>
                          <span className="text-muted-foreground/60">max 5MB</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full rounded-lg border border-border overflow-hidden bg-muted/30">
                      <div className="flex items-start gap-4 p-4">
                        <div
                          onClick={handlePreviewClick}
                          className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer group"
                        >
                          <img
                            src={previewUrl}
                            alt="Valid ID Preview"
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <div className="flex flex-col items-center text-white">
                              <ZoomIn className="w-5 h-5" />
                              <span className="text-xs mt-1">View</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 py-1">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-green-600" />
                            <p className="text-sm font-medium text-foreground truncate">
                              {fileName || "Valid ID uploaded"}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Image uploaded successfully
                          </p>

                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={handlePreviewClick}
                              disabled={loading}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Preview
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={handleZoneClick}
                              disabled={loading}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              Change
                            </Button>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-8 w-8 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          onClick={handleRemoveFile}
                          disabled={loading}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Upload a clear photo of your valid government ID (e.g., National ID, Driver&apos;s License, Passport)
                  </p>
                  {errors.validID && <p className="text-sm text-red-600">{errors.validID.message}</p>}
                </div>

                {formError && (
                  <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                {success && (
                  <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {success}
                  </div>
                )}

                <Button className="w-full h-12 text-base bg-primary hover:bg-primary/90 cursor-pointer" type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Register Account"}
                </Button>

                <p className="text-center text-base text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/" className="text-primary hover:underline font-medium">
                    Sign In
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {showPreviewModal && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <button
            onClick={handleCloseModal}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div
            className="relative max-w-[90vw] max-h-[90vh] rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewUrl}
              alt="Valid ID Full Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />

            <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent p-4">
              <p className="text-white text-sm font-medium truncate">
                {fileName || "Valid ID"}
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